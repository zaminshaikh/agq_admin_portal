// src/components/EditAssetsSection.tsx
import React, { useState } from "react";
import {
  CContainer,
  CRow,
  CCol,
  CButton,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CFormInput,
} from "@coreui/react-pro";
import { AssetConfig, Client, FundConfig, initialFundsConfig } from "../db/database";
import { AssetFormComponent } from "./AssetFormComponent";

interface EditAssetsSectionProps {
  clientState: Client;
  setClientState: (clientState: Client) => void;
  useCompanyName: boolean;
  activeFund?: string;
  incrementAmount?: number;
  viewOnly?: boolean;
}

export const EditAssetsSection: React.FC<EditAssetsSectionProps> = ({
  clientState,
  setClientState,
  useCompanyName,
  activeFund,
  incrementAmount = 1000,
  viewOnly = false,
}) => {
  // Initialize fundsConfig as state
  const [fundsConfig, setFundsConfig] = useState<FundConfig[]>(initialFundsConfig);

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

    // Generate a unique id for the new asset
    // Example: agq-personal-2 or ak1-custom-field
    const sanitizedTitle = assetTitleTrimmed.toLowerCase().replace(/\s+/g, "-"); // e.g., "Personal 2" -> "personal-2"
    const newAssetId = `${currentFundKey}-${sanitizedTitle}`;

    // Determine asset type based on title or assign a generic type
    // For simplicity, we'll use the sanitized title as the type
    const newAssetType = sanitizedTitle; // e.g., "personal-2", "custom-field"

    // Check if asset with the same id or title already exists
    const fund = fundsConfig.find((f) => f.key === currentFundKey);
    if (fund) {
      // Check for duplicate asset titles
      const duplicateTitle = fund.assets.some(
        (asset) => asset.title.toLowerCase() === assetTitleTrimmed.toLowerCase()
      );
      if (duplicateTitle) {
        alert("An asset with this name already exists.");
        return;
      }

      // Check for duplicate asset IDs
      const duplicateId = fund.assets.some((asset) => asset.id === newAssetId);
      if (duplicateId) {
        alert("An asset with this identifier already exists.");
        return;
      }
    }

    // Create the new asset configuration
    const newAsset: AssetConfig = {
      id: newAssetId,
      title: assetTitleTrimmed,
      type: newAssetType,
    };

    // Update fundsConfig state
    const updatedFundsConfig = fundsConfig.map((fund) =>
      fund.key === currentFundKey
        ? { ...fund, assets: [...fund.assets, newAsset] }
        : fund
    );

    setFundsConfig(updatedFundsConfig);

    // Initialize the new asset in clientState.assets using the provided convention
    const newState: Client = {
      ...clientState,
      assets: {
        ...clientState.assets,
        [currentFundKey]: {
          ...clientState.assets[currentFundKey],
          [newAssetType]: 0, // Initialize to 0 or any default value
        },
      },
    };

    setClientState(newState);

    // Close the modal
    closeAddAssetModal();
  };

  // Function to handle removing an asset
  const handleRemoveAsset = (fundKey: string, assetType: string) => {
    if (!window.confirm(`Are you sure you want to remove the asset "${assetType}"?`)) {
      return;
    }

    // Remove from fundsConfig
    const updatedFundsConfig = fundsConfig.map((fund) =>
      fund.key === fundKey
        ? { ...fund, assets: fund.assets.filter((asset) => asset.type !== assetType) }
        : fund
    );

    setFundsConfig(updatedFundsConfig);

    // Remove from clientState.assets using the provided convention
    const newState: Client = {
      ...clientState,
      assets: {
        ...clientState.assets,
        [fundKey]: Object.keys(clientState.assets[fundKey]).reduce((acc, key) => {
          if (key !== assetType) {
            acc[key] = clientState.assets[fundKey][key];
          }
          return acc;
        }, {} as { [assetType: string]: number }),
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

    // Generate a new type based on the edited title
    const sanitizedTitle = assetTitleTrimmed.toLowerCase().replace(/\s+/g, "-");
    const newAssetType = sanitizedTitle;

    // Check for duplicate asset titles within the same fund
    const fund = fundsConfig.find((f) => f.key === fundKey);
    if (fund) {
      const duplicateTitle = fund.assets.some(
        (asset) => asset.type === newAssetType && asset.type !== oldAssetType
      );
      if (duplicateTitle) {
        alert("An asset with this name already exists.");
        return;
      }
    }

    // Update fundsConfig
    const updatedFundsConfig = fundsConfig.map((fund) =>
      fund.key === fundKey
        ? {
            ...fund,
            assets: fund.assets.map((asset) =>
              asset.type === oldAssetType
                ? { ...asset, title: assetTitleTrimmed, type: newAssetType }
                : asset
            ),
          }
        : fund
    );

    setFundsConfig(updatedFundsConfig);

    // Update clientState.assets using the provided convention
    const oldAssetValue = clientState.assets[fundKey][oldAssetType];
    const newAssets = {
      ...clientState.assets[fundKey],
      [newAssetType]: oldAssetValue,
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
      <CRow>
        {fundsConfig.map((fund: FundConfig) => (
          <CCol key={fund.key}>
            <div className="mb-2">
              <h5>{fund.displayName}</h5>
            </div>
            {fund.assets.map((asset: AssetConfig) => {
              // Determine the disabled state based on props and asset type
              let isDisabled = viewOnly;

              if (!isDisabled) {
                if (activeFund !== undefined) {
                  if (fund.key.toUpperCase() !== activeFund.toUpperCase()) {
                    isDisabled = true;
                  }
                }

                // Specific condition for company asset
                if (
                  asset.type === "company" &&
                  !(useCompanyName && activeFund?.toUpperCase() === fund.key.toUpperCase())
                ) {
                  isDisabled = true;
                }
              }

              return (
                <AssetFormComponent
                  key={asset.id}
                  title={asset.title}
                  id={asset.id}
                  fundKey={fund.key}
                  assetType={asset.type}
                  clientState={clientState}
                  setClientState={setClientState}
                  disabled={isDisabled}
                  incrementAmount={incrementAmount}
                  onRemove={handleRemoveAsset}
                  onEdit={handleEditAsset}
                />
              );
            })}
            {/* Add Asset Button at the Bottom */}
            {!viewOnly && (
              <div className="mt-3">
                <CButton color="primary" onClick={() => openAddAssetModal(fund.key)}>
                  Add Asset
                </CButton>
              </div>
            )}
          </CCol>
        ))}
      </CRow>

      {/* Add Asset Modal */}
      <CModal visible={isModalOpen} onClose={closeAddAssetModal} alignment="center">
        <CModalHeader>Add New Asset</CModalHeader>
        <CModalBody>
          <CFormInput
            label="Asset Name"
            placeholder="Enter asset name (e.g., Personal 2, IRA 3, Custom Field)"
            value={newAssetTitle}
            onChange={(e) => setNewAssetTitle(e.target.value)}
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