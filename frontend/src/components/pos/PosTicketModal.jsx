import React, { useState, useEffect } from 'react';
import { Printer, X, Check, Layers, Sliders, ExternalLink } from 'lucide-react';
import printerService from '../../services/printerService';
import styles from './PosTicketModal.module.css';

const PosTicketModal = ({ isOpen, onClose, sale, initialConfig = null }) => {
  const [config, setConfig] = useState(initialConfig || null);
  const [paperWidth, setPaperWidth] = useState('80mm');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!initialConfig) {
        printerService.getPrinterConfig().then(cfg => {
          setConfig(cfg);
          if (cfg?.paperWidth) setPaperWidth(cfg.paperWidth);
        });
      } else {
        setConfig(initialConfig);
        if (initialConfig.paperWidth) setPaperWidth(initialConfig.paperWidth);
      }
    }
  }, [isOpen, initialConfig]);

  if (!isOpen || !sale) return null;

  const currentConfig = { ...(config || {}), paperWidth };
  const ticketHtml = printerService.generatePosTicketHtml(sale, currentConfig);

  const handlePrint = async () => {
    setLoading(true);
    await printerService.printPosTicket(sale, currentConfig);
    setLoading(false);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header del Modal */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrap}>
              <Printer size={20} />
            </div>
            <div>
              <h2 className={styles.title}>Tirilla de Venta POS</h2>
              <p className={styles.subtitle}>
                Formato para impresora térmica ({paperWidth})
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.widthSwitch}>
              <button
                type="button"
                className={`${styles.switchBtn} ${paperWidth === '80mm' ? styles.switchBtnActive : ''}`}
                onClick={() => setPaperWidth('80mm')}
              >
                80 mm
              </button>
              <button
                type="button"
                className={`${styles.switchBtn} ${paperWidth === '58mm' ? styles.switchBtnActive : ''}`}
                onClick={() => setPaperWidth('58mm')}
              >
                58 mm
              </button>
            </div>

            <button type="button" onClick={onClose} className={styles.closeBtn} title="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido: Vista previa de papel térmico */}
        <div className={styles.previewContainer}>
          <div
            className={`${styles.paperRoll} ${paperWidth === '58mm' ? styles.paperRoll58 : styles.paperRoll80}`}
          >
            <div className={styles.paperEdgeTop}></div>
            <iframe
              srcDoc={ticketHtml}
              title="Ticket Preview"
              className={styles.ticketFrame}
            />
            <div className={styles.paperEdgeBottom}></div>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className={styles.footer}>
          <button type="button" onClick={onClose} className="neo-btn neo-btn-secondary">
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading}
            className="neo-btn neo-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px', justifyContent: 'center' }}
          >
            <Printer size={18} />
            {loading ? 'Enviando a impresora...' : 'Imprimir Ticket POS'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosTicketModal;
