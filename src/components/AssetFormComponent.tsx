// src/components/AssetFormComponent.tsx
import React, { useState } from "react";
import {
  CInputGroup,
  CInputGroupText,
  CFormInput,
  CButton,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CTooltip,
  CFormLabel,
} from "@coreui/react-pro";
import CIcon from "@coreui/icons-react";
import { cilPencil, cilTrash } from "@coreui/icons";
import { Client } from "../db/database";

interface AssetFormComponentProps {
  title: string;
  id: string;
  fundKey: string;
  assetType: string;
  disabled?: boolean;
  clientState: Client;
  setClientState: (clientState: Client) => void;
  incrementAmount: number;
  onRemove: (fundKey: string, assetType: string) => void;
  onEdit: (fundKey: string, oldAssetType: string, newAssetTitle: string) => void;
  isEditable: boolean; // Indicates if the asset can be edited or deleted
}

export const AssetFormComponent: React.FC<AssetFormComponentProps> = ({
  title,
  id,
  fundKey,
  assetType,
  disabled = false,
  clientState,
  setClientState,
  incrementAmount,
  onRemove,
  onEdit,
  isEditable,
}) => {
  const asset = clientState.assets[fundKey]?.[assetType] ?? {
    amount: 0,
    firstDepositDate: null,
    displayTitle: title,
  };

  // State for managing Edit Asset modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState<string>(title);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      const parsedValue = parseFloat(value);

      // Update clientState
      const newState: Client = {
        ...clientState,
        assets: {
          ...clientState.assets,
          [fundKey]: {
            ...clientState.assets[fundKey],
            [assetType]: {
              ...asset,
              amount: parsedValue,
            },
          },
        },
      };
      setClientState(newState);
    }
  };

  const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || isNaN(parseFloat(value))) {
      // Update clientState
      const newState: Client = {
        ...clientState,
        assets: {
          ...clientState.assets,
          [fundKey]: {
            ...clientState.assets[fundKey],
            [assetType]: {
              ...asset,
              amount: 0,
            },
          },
        },
      };
      setClientState(newState);
    }
  };

  // Function to handle opening the Edit Asset modal
  const openEditModal = () => {
    setEditedTitle(title);
    setIsEditModalOpen(true);
  };

  // Function to handle closing the Edit Asset modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditedTitle(title);
  };

  // Function to handle saving the edited asset title
  const handleSaveEdit = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle === "") {
      alert("Asset name cannot be empty.");
      return;
    }

    // Pass the edit to the parent component
    onEdit(fundKey, assetType, trimmedTitle);

    // Close the modal
    setIsEditModalOpen(false);
  };

  // Function to handle removing the asset
  const handleRemoveAsset = () => {
    onRemove(fundKey, assetType);
  };

  return (
    <>
      <CInputGroup className="mb-3 py-3">
        <CInputGroupText style={{ width: "200px" }}>{asset.displayTitle}</CInputGroupText>
        <CInputGroupText>$</CInputGroupText>
        <CFormInput
          id={id}
          disabled={disabled}
          type="number"
          step={incrementAmount}
          value={asset.amount}
          onChange={handleAmountChange}
          onBlur={handleAmountBlur}
        />
        {/* Conditionally render Edit and Remove buttons based on isEditable */}
        {isEditable && (
          <>
            <CTooltip content={`Edit Asset Name`} placement="top">
              <CButton
                variant="outline"
                className="ms-2 p-0 border-0"
                onClick={openEditModal}
                aria-label={`Edit ${title}`}
                disabled={disabled}
              >
                <CIcon icon={cilPencil} size="lg" />
              </CButton>
            </CTooltip>
            <CTooltip content={`Remove ${title} as an Asset`} placement="top">
              <CButton
                variant="ghost"
                className="ms-2 p-0 border-0"
                onClick={handleRemoveAsset}
                aria-label={`Remove ${title}`}
                disabled={disabled}
              >
                <CIcon icon={cilTrash} size="lg" />
              </CButton>
            </CTooltip>
          </>
        )}
      </CInputGroup>

      {/* Edit Asset Modal */}
      {isEditable && (
        <CModal visible={isEditModalOpen} onClose={closeEditModal} alignment="center">
          <CModalHeader>Edit Asset</CModalHeader>
          <CModalBody>
            <CFormInput
              label="Asset Name"
              placeholder="Enter new asset name"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              disabled={disabled}
            />
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={closeEditModal} disabled={disabled}>
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleSaveEdit} disabled={disabled}>
              Save
            </CButton>
          </CModalFooter>
        </CModal>
      )}
    </>
  );
};