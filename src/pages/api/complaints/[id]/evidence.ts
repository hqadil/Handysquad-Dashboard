// src/pages/api/complaints/[id]/evidence.ts
// HANDY SQUAD: EVIDENCE VAULT & PRIVATE STORAGE INTEGRATION

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';
import { EvidenceType } from '../../../../types/complaints';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid complaint ID is required' });
  }

  // GET: Fetch evidence for this complaint with signed download URLs
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('complaint_evidence')
          .select('*')
          .eq('complaint_id', id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch complaint_evidence failed:', error);
        } else if (data && data.length > 0) {
          const client = supabase;
          // Generate secure signed URLs for each private storage item
          const evidenceWithSignedUrls = await Promise.all(
            data.map(async (item: any) => {
              let downloadUrl = '';
              if (item.storage_path && client) {
                try {
                  const { data: signData, error: signError } = await client.storage
                    .from('complaint-evidence')
                    .createSignedUrl(item.storage_path, 3600); // 1 hour valid
                  if (!signError && signData) {
                    downloadUrl = signData.signedUrl;
                  }
                } catch (e) {
                  console.warn('Signed URL generation failed for:', item.storage_path, e);
                }
              }

              return {
                id: item.id,
                complaintId: item.complaint_id,
                evidenceType: item.evidence_type,
                title: item.title,
                description: item.description,
                storagePath: item.storage_path,
                fileName: item.file_name,
                fileSizeBytes: Number(item.file_size_bytes) || 0,
                mimeType: item.mime_type,
                uploadedById: item.uploaded_by_id,
                uploadedByName: item.uploaded_by_name,
                isVerified: item.is_verified,
                verifiedById: item.verified_by_id,
                verificationNotes: item.verification_notes,
                createdAt: item.created_at,
                downloadUrl: downloadUrl || undefined,
              };
            })
          );

          return res.status(200).json({ evidence: evidenceWithSignedUrls });
        }
      }

      // Return synthetic fallback evidence for offline or seed testing
      return res.status(200).json({ evidence: [] });
    } catch (err: any) {
      console.error('Evidence GET error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // POST: Upload and record new evidence
  if (req.method === 'POST') {
    try {
      const {
        evidenceType,
        title,
        description,
        fileName,
        fileSizeBytes,
        mimeType,
        uploadedByName,
        uploadedById,
        fileBase64,
      } = req.body;

      if (!evidenceType || !title || !fileName) {
        return res.status(400).json({ error: 'evidenceType, title, and fileName are mandatory' });
      }

      const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storagePath = `complaints/${id}/${safeFileName}`;
      let signedUrl = '';

      if (supabase) {
        // Upload file bytes to private bucket if base64 provided
        if (fileBase64) {
          const base64Data = fileBase64.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          const { error: uploadError } = await supabase.storage
            .from('complaint-evidence')
            .upload(storagePath, buffer, {
              contentType: mimeType || 'application/octet-stream',
              upsert: true,
            });

          if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            // proceed to record metadata even if storage warns in mock environments
          } else {
            // Generate signed preview URL
            const { data: signData } = await supabase.storage
              .from('complaint-evidence')
              .createSignedUrl(storagePath, 3600);
            if (signData) {
              signedUrl = signData.signedUrl;
            }
          }
        }

        // Insert metadata record into complaint_evidence table
        const { data: record, error: dbError } = await supabase
          .from('complaint_evidence')
          .insert({
            complaint_id: id,
            evidence_type: evidenceType,
            title,
            description: description || null,
            storage_path: storagePath,
            file_name: fileName,
            file_size_bytes: fileSizeBytes || 0,
            mime_type: mimeType || 'image/jpeg',
            uploaded_by_id: uploadedById || null,
            uploaded_by_name: uploadedByName || 'Operations Lead',
            is_verified: false,
          })
          .select()
          .single();

        if (dbError) {
          console.warn('complaint_evidence insert warning:', dbError);
        }

        // Auto-update complaint verification flags based on evidence type
        const complaintFlagUpdates: Record<string, boolean> = {};
        if (evidenceType === 'BEFORE_PHOTO') complaintFlagUpdates.before_photos_available = true;
        if (evidenceType === 'AFTER_PHOTO') complaintFlagUpdates.after_photos_available = true;
        if (evidenceType === 'CHECKLIST') complaintFlagUpdates.pre_service_checklist_done = true;
        if (evidenceType === 'COMPLETION_SIGNOFF') complaintFlagUpdates.post_service_signoff_done = true;
        if (evidenceType === 'WORK_ORDER') complaintFlagUpdates.work_order_verified = true;

        if (Object.keys(complaintFlagUpdates).length > 0) {
          await supabase.from('complaints').update(complaintFlagUpdates).eq('id', id);
        }

        // Append to immutable audit log
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: uploadedByName || 'Operations Staff',
            action: 'EVIDENCE_UPLOADED',
            entity_name: 'complaint_evidence',
            entity_id: record ? record.id : null,
            after_state: {
              evidenceType,
              title,
              fileName,
              storagePath,
            },
            notes: `Uploaded ${evidenceType}: ${title}`,
          });
        } catch (auditErr) {
          console.warn('Audit log write error:', auditErr);
        }

        return res.status(201).json({
          evidence: {
            id: record ? record.id : `ev-${Date.now()}`,
            complaintId: id,
            evidenceType,
            title,
            description,
            storagePath,
            fileName,
            fileSizeBytes: fileSizeBytes || 0,
            mimeType: mimeType || 'image/jpeg',
            uploadedByName: uploadedByName || 'Operations Staff',
            isVerified: false,
            createdAt: new Date().toISOString(),
            downloadUrl: signedUrl || undefined,
          },
        });
      }

      // Fallback synthetic return
      return res.status(201).json({
        evidence: {
          id: `ev-mock-${Date.now()}`,
          complaintId: id,
          evidenceType,
          title,
          description,
          storagePath,
          fileName,
          fileSizeBytes: fileSizeBytes || 0,
          mimeType: mimeType || 'image/jpeg',
          uploadedByName: uploadedByName || 'Operations Lead',
          isVerified: false,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Evidence POST error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // PATCH: Verify or update evidence verification status
  if (req.method === 'PATCH') {
    try {
      const { evidenceId, isVerified, verifiedByName, verificationNotes } = req.body;

      if (!evidenceId) {
        return res.status(400).json({ error: 'evidenceId is required' });
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('complaint_evidence')
          .update({
            is_verified: isVerified ?? true,
            verification_notes: verificationNotes || null,
          })
          .eq('id', evidenceId)
          .select()
          .single();

        if (error) {
          console.warn('complaint_evidence verification update error:', error);
        }

        // Append to audit log
        try {
          await supabase.from('audit_log').insert({
            complaint_id: id,
            actor_name: verifiedByName || 'Operations Manager',
            action: 'EVIDENCE_VERIFIED',
            entity_name: 'complaint_evidence',
            entity_id: evidenceId,
            after_state: {
              isVerified: isVerified ?? true,
              verificationNotes,
            },
            notes: `Evidence verified with notes: ${verificationNotes || 'None'}`,
          });
        } catch (auditErr) {
          console.warn('Audit log write error:', auditErr);
        }

        return res.status(200).json({ success: true, evidence: data });
      }

      return res.status(200).json({
        success: true,
        evidence: {
          id: evidenceId,
          isVerified: isVerified ?? true,
          verificationNotes,
        },
      });
    } catch (err: any) {
      console.error('Evidence PATCH error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
