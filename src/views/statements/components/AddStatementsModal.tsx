import React, { useState, useEffect } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormInput,
  CMultiSelect,
  CButton,
  CInputGroupText,
  CInputGroup,
  CFormSelect,
} from '@coreui/react-pro';
import { Client, DatabaseService } from 'src/db/database';
import { EditAssetsSection } from 'src/components/EditAssetsSection';
import { useDropzone } from 'react-dropzone';
import { ref, uploadBytes } from 'firebase/storage';
import { getStorage } from 'firebase/storage';

interface AddStatementModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const AddStatementModal: React.FC<AddStatementModalProps> = ({
  visible,
  onClose,
  onUploadSuccess,
}) => {
  const db = new DatabaseService();

  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isRecipientSameAsClient, setIsRecipientSameAsClient] = useState<boolean>(true);
  const [activityState, setActivityState] = useState<any>({}); // Define appropriate type
  const [clientState, setClientState] = useState<Client | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      const fetchedClients = await db.getClients();
      setClients(fetchedClients);
      setFilteredClients(fetchedClients);
    };
    fetchClients();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const clientOptions = clients.map((client) => ({
    label: `${client.firstName} ${client.lastName}`,
    value: client.cid,
  }));

  const handleClientChange = async (selectedValue: { label: string; value: string | number }[]) => {
    const singleSelection = selectedValue.slice(0, 1);
    if (singleSelection.length === 0) {
      setClientState(await db.getClient(activityState.parentDocId ?? ''));
    } else {
      const client = singleSelection[0].label as string;
      const cid = singleSelection[0].value as string;
      console.log(cid);
      setClientState(await db.getClient(cid) ?? await db.getClient(activityState.parentDocId ?? ''));

      if (isRecipientSameAsClient) {
        setActivityState({ ...activityState, recipient: client });
      }
    }
  };

  const handleUpload = async () => {
    await uploadFiles();
  };

  const handleDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setIsDragActive(false);
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      setIsDragActive(false);
    },
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const uploadFiles = async () => {
    if (!clientState || !clientState.cid) {
      console.error('No client selected.');
      return;
    }

    if (files.length === 0) {
      console.error('No files to upload.');
      return;
    }

    setUploading(true);
    const cid = clientState.cid;
    const uploadPromises = files.map((file) => {
      const storagePath = `testUsersStatements/${cid}/${file.name}`;
      console.log(`Uploading file to: ${storagePath}`);
      const storageRef = ref(getStorage(), storagePath);
      return uploadBytes(storageRef, file);
    });

    try {
      await Promise.all(uploadPromises);
      console.log('All files uploaded successfully.');
      onUploadSuccess();
      setFiles([]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <CModal visible={visible} onClose={onClose}>
      <CModalHeader closeButton>
        <CModalTitle>Add Statement</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CMultiSelect
          options={clientOptions}
          onChange={handleClientChange}
          placeholder="Select Client"
          multiple={false}
        />

        <div className="mb-3">
          <label>Drag and drop PDF files here, or click to select files</label>
          <div
            {...getRootProps()}
            style={{
              border: '2px dashed #ccc',
              borderRadius: '5px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragActive ? '#f0f8ff' : '#fafafa',
            }}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <p>Drag & drop some files here, or click to select files</p>
            )}
          </div>
          {files.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <strong>Selected files:</strong>
              <ul>
                {files.map((file) => (
                  <li key={file.name}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={uploading}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleUpload} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default AddStatementModal;