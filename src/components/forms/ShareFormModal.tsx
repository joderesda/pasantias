import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Copy, Check, QrCode } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { useTranslation } from 'react-i18next';

interface ShareFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formName: string;
}

const ShareFormModal: React.FC<ShareFormModalProps> = ({ isOpen, onClose, formId, formName }) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/formulario/${formId}`;

  // Generate QR code URL using an external service
  useEffect(() => {
    const generateQrCode = () => {
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
      setQrCodeUrl(qrCode);
    };

    if (isOpen) {
      generateQrCode();
    }
  }, [isOpen, shareUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({
      title: t('link_copied'),
      description: t('form_link_copied'),
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `formulario-${formName}-${formId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{t('share_form')}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 border rounded-lg bg-white">
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt={t('qr_code_for_form')} 
                className="w-48 h-48 mx-auto"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-500 text-center">
            {t('scan_qr_or_share_link')}
          </p>
          
          <div className="flex w-full items-center space-x-2">
            <div className="flex-1 p-2 border rounded-md text-sm truncate">
              {shareUrl}
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="px-3"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <Button 
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleDownloadQR}
            disabled={!qrCodeUrl}
          >
            <QrCode className="mr-2 h-4 w-4" />
            {t('download_qr_code')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareFormModal;
