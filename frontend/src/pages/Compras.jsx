import React, { useState } from 'react';
import PurchaseHistory from './Purchases/PurchaseHistory';
import PurchaseForm from './Purchases/PurchaseForm';

const PurchasesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setIsModalOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="w-full">
      <PurchaseHistory
        onAddNew={() => setIsModalOpen(true)}
        refreshTrigger={refreshTrigger}
      />
      <PurchaseForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default PurchasesPage;