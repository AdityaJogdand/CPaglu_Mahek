import React from "react";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Add Patient</h2>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default AddPatientModal;
