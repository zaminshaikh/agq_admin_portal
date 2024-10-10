// src/components/EditAssetsSection.tsx
import React, { useState, useEffect } from "react";
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
  activeFund?: string;
  incrementAmount?: number;
  viewOnly?: boolean;
}

// Define keys to exclude (case-insensitive)
const excludedAssetKeys = ["total", "fund"];

// Define protected asset types (case-insensitive)
const protectedAssetTypes = [
  "personal",
  "company",
  "ira",
  "roth ira",
  "sep ira",
  "nuview cash ira",
  "nuview cash roth ira",
];

export const EditAssetsSection: React.FC<EditAssetsSectionProps> = ({
  clientState,
  setClientState,
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

  // Synchronize fundsConfig with clientState.assets on component mount or when clientState.assets changes
  useEffect(() => {
    const updatedFundsConfig = initialFundsConfig.map((fund) => {
      const clientAssets = clientState.assets[fund.key] || {};
      const existingAssetTypes = fund.assets.map((asset) => asset.type.toLowerCase());

      // Identify additional asset types not present in initialFundsConfig, excluding 'total' and 'fund'
      const additionalAssetTypes = Object.keys(clientAssets).filter(
        (assetType) =>
          !existingAssetTypes.includes(assetType.toLowerCase()) &&
          !excludedAssetKeys.includes(assetType.toLowerCase())
      );

      // Create additional AssetConfig entries for new asset types
      const additionalAssets = additionalAssetTypes.map((assetType) => {
        // Use displayTitle from clientAssets if available, else default to formatted assetType
        const displayTitle =
          clientAssets[assetType]?.displayTitle || assetType.replace(/-/g, " ");

        return {
          id: `${fund.key}-${assetType}`,
          title: displayTitle,
          type: assetType,
          isEditable: true, // Dynamically added assets are editable
        };
      });

      return {
        ...fund,
        assets: [...fund.assets, ...additionalAssets],
      };
    });
    setFundsConfig(updatedFundsConfig);
  }, [clientState.assets]);

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

    // Generate a unique id for the new asset
    const sanitizedTitle = assetTitleTrimmed.toLowerCase().replace(/\s+/g, "-");
    const newAssetId = `${currentFundKey}-${sanitizedTitle}`;
    const newAssetType = sanitizedTitle; // Use this as the dynamic key

    // Check for duplicates
    const fund = fundsConfig.find((f) => f.key === currentFundKey);
    if (fund) {
      const duplicateTitle = fund.assets.some(
        (asset) => asset.title.toLowerCase() === assetTitleTrimmed.toLowerCase()
      );
      if (duplicateTitle) {
        alert("An asset with this name already exists.");
        return;
      }

      const duplicateId = fund.assets.some((asset) => asset.id === newAssetId);
      if (duplicateId) {
        alert("An asset with this identifier already exists.");
        return;
      }
    }

    // Create the new asset configuration
    const newAsset: AssetConfig = {
      id: newAssetId,
      title: assetTitleTrimmed, // Use the title as entered
      type: newAssetType,
      isEditable: true, // Mark as editable
    };

    // Update fundsConfig
    const updatedFundsConfig = fundsConfig.map((fund) =>
      fund.key === currentFundKey
        ? { ...fund, assets: [...fund.assets, newAsset] }
        : fund
    );
    setFundsConfig(updatedFundsConfig);

    // Initialize the new asset in clientState.assets using the correct dynamic key
    const newState: Client = {
      ...clientState,
      assets: {
        ...clientState.assets,
        [currentFundKey]: {
          ...clientState.assets[currentFundKey],
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
      protectedAssetTypes.includes(assetType.toLowerCase()) ||
      excludedAssetKeys.includes(assetType.toLowerCase())
    ) {
      alert("This asset cannot be removed.");
      return;
    }

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

    // Remove from clientState.assets
    const newAssets = { ...clientState.assets[fundKey] };
    delete newAssets[assetType];

    const newState: Client = {
      ...clientState,
      assets: {
        ...clientState.assets,
        [fundKey]: newAssets,
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

    // Prevent editing protected assets
    if (protectedAssetTypes.includes(oldAssetType.toLowerCase())) {
      alert("This asset cannot be edited.");
      return;
    }

    // Generate a new type based on the edited title
    const newAssetType = assetTitleTrimmed.toLowerCase().replace(/\s+/g, "-");

    // Check for duplicate asset titles within the same fund
    const fund = fundsConfig.find((f) => f.key === fundKey);
    if (fund) {
      const duplicateTitle = fund.assets.some(
        (asset) =>
          asset.type.toLowerCase() === newAssetType && asset.type !== oldAssetType
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

    // Update clientState.assets
    const oldAsset = clientState.assets[fundKey][oldAssetType];
    const newAssets = {
      ...clientState.assets[fundKey],
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
    <CContainer className="py-3 pb-5">
      {fundsConfig.map((fund: FundConfig) => (
        <div key={fund.key} className="mb-5">
          <div className="mb-2 pb-3">
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
                isEditable={asset.isEditable ?? false} // Pass isEditable flag
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