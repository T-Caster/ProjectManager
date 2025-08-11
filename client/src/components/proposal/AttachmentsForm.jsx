import React, { useRef } from 'react';
import { Stack, Button, Chip, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { SectionCard } from './ui';
import { uploadProposalPdf, saveDraft } from '../../services/proposalService';

const AttachmentsForm = ({ formData, setFormData, setToast, setError, proposal, readOnlyMode, handleDownload }) => {
    const fileInputRef = useRef(null);

    const handleFilePick = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fd = new FormData();
        fd.append('proposalPdf', file);

        try {
            const { data } = await uploadProposalPdf(fd);
            setFormData(prev => ({ ...prev, attachmentName: data.file.originalName, attachmentId: data.file._id }));
            setToast('Attachment uploaded successfully.');
            // Persist the attachment onto the draft immediately:
            await saveDraft({ proposalId: proposal?._id, attachmentId: data.file._id });
            setToast('Attachment linked to draft.');
        } catch (err) {
            console.error(err);
            setError(err?.response?.data?.msg || 'Failed to upload file.');
        }
    };

    return (
        <SectionCard title="Attachments" step={5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Button
                    variant="contained"
                    startIcon={<UploadFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={readOnlyMode}
                >
                    Upload Proposal PDF
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf"
                    onChange={handleFilePick}
                    disabled={readOnlyMode}
                />
                {formData.attachmentName ? (
                    <Chip
                        label={formData.attachmentName}
                        variant="outlined"
                        onDelete={
                            !readOnlyMode && formData.attachmentId
                                ? async () => {
                                    try {
                                        await saveDraft({ proposalId: proposal?._id, removeAttachment: true });
                                        setFormData(prev => ({ ...prev, attachmentId: '', attachmentName: '' }));
                                        setToast('Attachment removed.');
                                    } catch (e) {
                                        console.error(e);
                                        setError(e?.response?.data?.msg || 'Failed to remove attachment.');
                                    }
                                }
                                : undefined
                        }
                        onClick={handleDownload} // download still allowed in read-only
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        PDF only, up to ~10MB.
                    </Typography>
                )}
            </Stack>
        </SectionCard>
    );
};

export default AttachmentsForm;
