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
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-4">
        <DialogHeader className="px-2 sm:px-0">
          <DialogTitle className="text-center text-lg font-semibold">
            {t('share_form') || 'Compartir formulario'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 p-2 sm:p-0">
          <div className="p-3 border rounded-lg bg-white shadow-sm w-full max-w-xs">
            {qrCodeUrl ? (
              <div className="flex justify-center">
                <img 
                  src={qrCodeUrl} 
                  alt={t('qr_code_for_form') || 'Código QR del formulario'} 
                  className="w-40 h-40 object-contain"
                />
              </div>
            ) : (
              <div className="w-40 h-40 flex items-center justify-center bg-gray-50 rounded">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 text-center px-2">
            {t('scan_qr_or_share_link') || 'Escanee el código QR o comparta el enlace a continuación'}
          </p>
          
          <div className="w-full space-y-2">
            <div className="flex items-center space-x-2 w-full">
              <div className="flex-1 p-2 border rounded-md text-sm bg-gray-50 overflow-x-auto max-w-[calc(100%-44px)]">
                <p className="whitespace-nowrap">{shareUrl}</p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                className="shrink-0 w-10 h-10"
                onClick={handleCopyLink}
                title={copied ? (t('copied') || 'Copiado') : (t('copy') || 'Copiar')}
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
              className="w-full text-sm h-10"
              onClick={handleDownloadQR}
              disabled={!qrCodeUrl}
            >
              <QrCode className="mr-2 h-4 w-4" />
              {t('download_qr_code') || 'Descargar código QR'}
            </Button>
            
            <div className="text-xs text-gray-500 text-center pt-2">
              {t('form_share_note') || 'Cualquier persona con el enlace puede ver y enviar respuestas'}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareFormModal;
