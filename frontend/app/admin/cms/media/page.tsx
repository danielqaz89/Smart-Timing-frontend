"use client";

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { AdminProvider, useAdmin } from '../../../../contexts/AdminContext';
import AdminLayout from '../../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

interface MediaFile {
  id: number;
  filename: string;
  original_filename: string;
  type: string;
  size: number;
  url: string;
  uploaded_at: string;
  uploaded_by_email?: string;
}

function MediaContent() {
  const { fetchWithAuth } = useAdmin();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/cms/media`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load media');
      setMedia(data);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/admin/cms/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload file');

      await loadMedia();
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number, filename: string) {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/cms/media/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete file');

      await loadMedia();
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete file');
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getFileTypeChip(type: string) {
    if (type.startsWith('image/')) return <Chip label="Image" color="primary" size="small" />;
    if (type.startsWith('video/')) return <Chip label="Video" color="secondary" size="small" />;
    if (type.includes('pdf')) return <Chip label="PDF" color="error" size="small" />;
    return <Chip label="Document" color="default" size="small" />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        CMS Media Library
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            component="label"
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
            disabled={uploading}
          >
            Upload File
            <input
              hidden
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            Max 50MB. Supports: images, videos, PDF, Word documents
          </Typography>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Preview</TableCell>
                <TableCell>Filename</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell>By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {media.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No media files uploaded yet
                  </TableCell>
                </TableRow>
              ) : (
                media.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      {file.type.startsWith('image/') ? (
                        <img
                          src={`${API_BASE}${file.url}`}
                          alt={file.original_filename}
                          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                        />
                      ) : (
                        <Box sx={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200', borderRadius: 1 }}>
                          {getFileTypeChip(file.type)}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {file.original_filename}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {file.filename}
                      </Typography>
                    </TableCell>
                    <TableCell>{getFileTypeChip(file.type)}</TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                      >
                        {file.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(file.uploaded_at).toLocaleDateString('no-NO')}
                    </TableCell>
                    <TableCell>{file.uploaded_by_email || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(file.id, file.original_filename)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default function MediaPage() {
  return (
    <AdminProvider>
      <AdminLayout>
        <MediaContent />
      </AdminLayout>
    </AdminProvider>
  );
}
