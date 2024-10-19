// src/components/EditAssetsSection.tsx
import React, { useState } from "react";
import {
  CContainer,
  CButton,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CFormInput,
} from "@coreui/react-pro";
import { Client } from "../db/database";
import { AssetFormComponent } from "./AssetFormComponent";

interface EditAssetsSectionProps {
  clientState: Client;
  setClientState: (clientState: Client) => void;
  activeFund?: string;
  incrementAmount?: number;
  viewOnly?: boolean;
}

// Define keys to exclude (case-insensitive)
const excludedAssetKeys = ["total", "fund"];

export const EditAssetsSection: React.FC<EditAssetsSectionProps> = ({
  clientState,
  setClientState,
  activeFund,
  incrementAmount = 1000,
  viewOnly = false,
}) => {
  // State for managing the "Add Asset" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFundKey, setCurrentFundKey] = useState<string | null>(null);
  const [newAssetTitle, setNewAssetTitle] = useState<string>("");

  // Function to handle opening the modal
  const openAddAssetModal = (fundKey: string) => {
    setCurrentFundKey(fundKey);
    setNewAssetTitle("");
    setIsModalOpen(true);
  };

  // Function to handle closing the modal
  const closeAddAssetModal = () => {
    setIsModalOpen(false);
    setCurrentFundKey(null);
    setNewAssetTitle("");
  };

  // Function to handle adding a new asset
  const handleAddAsset = () => {
    if (!currentFundKey) return;

    const assetTitleTrimmed = newAssetTitle.trim();
    if (assetTitleTrimmed === "") {
      alert("Asset name cannot be empty.");
      return;
    }

    // Prevent adding 'total', 'Total', 'fund', 'Fund'
    if (excludedAssetKeys.includes(assetTitleTrimmed.toLowerCase())) {
      alert("The asset name 'total' or 'fund' is reserved and cannot be used.");
      return;
    }

    // Generate a unique type for the new asset
    const sanitizedTitle = assetTitleTrimmed.toLowerCase().replace(/\s+/g, "-");
    const newAssetType = sanitizedTitle; // Use this as the dynamic key

    // Check for duplicates
    const fundAssets = clientState.assets[currentFundKey] || {};
    const duplicateTitle = Object.values(fundAssets).some(
      (asset) => asset.displayTitle.toLowerCase() === assetTitleTrimmed.toLowerCase()
    );
    if (duplicateTitle) {
      alert("An asset with this name already exists.");
      return;
    }

    // Initialize the new asset in clientState.assets using the correct dynamic key
    const newState: Client = {
      ...clientState,
      assets: {
        ...clientState.assets,
        [currentFundKey]: {
          ...fundAssets,
          [newAssetType]: {
            amount: 0,
            firstDepositDate: null,
            displayTitle: assetTitleTrimmed,
          },
        },
      },
    };
    setClientState(newState);

    // Close the modal
    closeAddAssetModal();
  };

  // Function to handle removing an asset
  const handleRemoveAsset = (fundKey: string, assetType: string) => {
    // Prevent removing protected assets and excluded keys
    if (
      excludedAssetKeys.includes(assetType.toLowerCase())
    ) {
      alert("This asset cannot be removed.");
      return;
    }

    if (!window.confirm(`Are you sure you want to remove the asset "${assetType}"?`)) {
      return;
    }

    // Remove from clientState.assets
    const fundAssets = { ...clientState.assets[fundKey] };
    delete fundAssets[assetType];

    const newState: Client = {
      ...clientState,
      assets: {
        ...clientState.assets,
        [fundKey]: fundAssets,
      },
    };
    setClientState(newState);
  };

  // Function to handle editing an asset title
  const handleEditAsset = (fundKey: string, oldAssetType: string, newAssetTitle: string) => {
    const assetTitleTrimmed = newAssetTitle.trim();
    if (assetTitleTrimmed === "") {
      alert("Asset name cannot be empty.");
      return;
    }

    // Prevent renaming to 'total', 'Total', 'fund', 'Fund'
    if (excludedAssetKeys.includes(assetTitleTrimmed.toLowerCase())) {
      alert("The asset name 'total' or 'fund' is reserved and cannot be used.");
      return;
    }

    // Generate a new type based on the edited title
    const newAssetType = assetTitleTrimmed.toLowerCase().replace(/\s+/g, "-");

    // Check for duplicate asset titles within the same fund
    const fundAssets = clientState.assets[fundKey];
    const duplicateTitle = Object.values(fundAssets).some(
      (asset) =>
        asset.displayTitle.toLowerCase() === assetTitleTrimmed.toLowerCase() &&
        asset.displayTitle.toLowerCase() !== fundAssets[oldAssetType].displayTitle.toLowerCase()
    );
    if (duplicateTitle) {
      alert("An asset with this name already exists.");
      return;
    }

    // Update clientState.assets
    const oldAsset = fundAssets[oldAssetType];
    const newAssets = {
      ...fundAssets,
      [newAssetType]: {
        ...oldAsset,
        displayTitle: assetTitleTrimmed,
      },
    };
    delete newAssets[oldAssetType];

    const newState: Client = {
      ...clientState,
      assets: {
        ...clientState.assets,
        [fundKey]: newAssets,
      },
    };
    setClientState(newState);
  };

  return (
    <CContainer className="py-3">
      {Object.entries(clientState.assets).map(([fundKey, fundAssets]) => (
        <div key={fundKey} className="mb-5">
          <div className="mb-2 pb-3">
            <h5>{fundKey.toUpperCase()} Fund Assets</h5>
          </div>
          {Object.entries(fundAssets).map(([assetType, asset]) => {
            if (excludedAssetKeys.includes(assetType.toLowerCase())) {
              return null; // Skip excluded keys
            }

            // Determine the disabled state based on props and asset type
            let isDisabled = viewOnly;

            if (!isDisabled) {
              if (activeFund !== undefined) {
                if (fundKey.toUpperCase() !== activeFund.toUpperCase()) {
                  isDisabled = true;
                }
              }
            }

            return (
              <AssetFormComponent
                key={`${fundKey}-${assetType}`}
                title={asset.displayTitle}
                id={`${fundKey}-${assetType}`}
                fundKey={fundKey}
                assetType={assetType}
                clientState={clientState}
                setClientState={setClientState}
                disabled={isDisabled}
                incrementAmount={incrementAmount}
                onRemove={handleRemoveAsset}
                onEdit={handleEditAsset}
                isEditable={true} // All assets are editable unless restricted
              />
            );
          })}
          {/* Add Asset Button at the Bottom */}
          {!viewOnly && (
            <div className="mt-3">
              <CButton color="primary" onClick={() => openAddAssetModal(fundKey)}>
                Add Asset
              </CButton>
            </div>
          )}
        </div>
      ))}

      {/* Add Asset Modal */}
      <CModal visible={isModalOpen} onClose={closeAddAssetModal} alignment="center">
        <CModalHeader>Add New Asset</CModalHeader>
        <CModalBody>
          <CFormInput
            label="Asset Name"
            placeholder="Enter asset name (e.g., Personal 2, IRA 3, Custom Field)"
            value={newAssetTitle}
            onChange={(e) => setNewAssetTitle(e.target.value.replace(/["']/g, ""))}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeAddAssetModal}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleAddAsset}>
            Add
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};