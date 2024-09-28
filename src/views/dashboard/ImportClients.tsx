import { CButton, CFormInput, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle, CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow } from "@coreui/react-pro";
import { useState } from "react";
import React from "react";
import { Client, emptyUser } from "src/db/database";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import EditClient from './EditClient';

interface ShowModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    clients: Client[];
}

export const ImportClients: React.FC<ShowModalProps> = ({ showModal, setShowModal }) => {
    const [file, setFile] = useState<File | null>(null);
    const [clientStates, setClientStates] = useState<Client[]>([]);
    const [editClientIndex, setEditClientIndex] = useState<number | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const selectedFile = event.target.files[0];
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file: File) => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension === 'csv') {
            parseCSV(file);
        } else if (fileExtension === 'xlsx') {
            parseXLSX(file);
        }
    };

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            complete: (results) => {
                const clients = results.data.map((row: any) => createClientState(row));
                setClientStates(clients);
                console.log(clients);
            }
        });
    };

    const parseXLSX = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const headers = json[0] as string[];
            const rows = json.slice(1);
            const clients = rows.map((row: any) => {
                const rowData = headers.reduce((acc, header, index) => {
                    acc[header] = row[index];
                    return acc;
                }, {} as any);
                return createClientState(rowData);
            });
            setClientStates(clients);
            console.log(clients);
        };
        reader.readAsArrayBuffer(file);
    };

    const createClientState = (row: any): Client => {
        return {
            ...emptyUser,
            firstName: row["CLIENT'S FIRST NAME"] || '',
            lastName: row["CLIENT'S LAST NAME"] || '',
            companyName: row["COMPANY NAME"] || '',
            address: row["ADDRESS"] || '',
            dob: row["DOB"] ? new Date(row["DOB"]) : null,
            phoneNumber: row["PHONE NUMBER"] || '',
            initEmail: row["Email"] || '',
            firstDepositDate: row["FIRST DEPOSIT DATE"] ? new Date(row["FIRST DEPOSIT DATE"]) : null,
            beneficiaries: row["BENEFICIARY"] ? [row["BENEFICIARY"]] : [],
            assets: {
                agq: {
                    personal: parseFloat(row["PERSONAL"]) || 0,
                    company: parseFloat(row["COMPANY"]) || 0,
                    trad: parseFloat(row["IRA"]) || 0,
                    roth: parseFloat(row["ROTH IRA"]) || 0,
                    sep: parseFloat(row["SEP IRA"]) || 0,
                    nuviewTrad: parseFloat(row["NUVIEW CASH IRA"]) || 0,
                    nuviewRoth: parseFloat(row["NUVIEW CASH ROTH IRA"]) || 0,
                },
                ak1: {
                    personal: 0,
                    company: 0,
                    trad: 0,
                    roth: 0,
                    sep: 0,
                    nuviewTrad: 0,
                    nuviewRoth: 0,
                },
            },
        };
    };

    const handleEditClient = (index: number) => {
        setEditClientIndex(index);
    };

    const handleSaveClient = (updatedClient: Client) => {
        const updatedClients = [...clientStates];
        if (editClientIndex !== null) {
            updatedClients[editClientIndex] = updatedClient;
            setClientStates(updatedClients);
            setEditClientIndex(null);
        }
    };

    const handleRemoveClient = (index: number) => {
        const updatedClients = clientStates.filter((_, i) => i !== index);
        setClientStates(updatedClients);
    };

    return (
        <div>
            <CModal
                scrollable
                alignment="center"
                visible={showModal}
                backdrop="static"
                size="xl"
                onClose={() => setShowModal(false)}
            >
                <CModalHeader>
                    <CModalTitle>Import Clients</CModalTitle>
                </CModalHeader>
                <CModalBody className="p-5">
                    <CFormInput type="file" onChange={handleFileChange} />
                    <div className="mt-3"></div>
                    <CTable striped hover >
                        <CTableHead >
                            <CTableRow>
                                <CTableHeaderCell>Index</CTableHeaderCell>
                                <CTableHeaderCell>Last Name</CTableHeaderCell>
                                <CTableHeaderCell>First Name</CTableHeaderCell>
                                <CTableHeaderCell>Actions</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {clientStates.map((client, index) => (
                                <CTableRow key={index}>
                                    <CTableDataCell>{index + 1}</CTableDataCell>
                                    <CTableDataCell>{client.lastName}</CTableDataCell>
                                    <CTableDataCell>{client.firstName}</CTableDataCell>
                                    <CTableDataCell>
                                        <CButton className="me-5" color="warning"  variant='outline' onClick={() => handleEditClient(index)}>Edit Client</CButton>
                                        <CButton color="danger"  variant='outline' onClick={() => handleRemoveClient(index)}>Remove</CButton>
                                    </CTableDataCell>
                                </CTableRow>
                            ))}
                        </CTableBody>
                    </CTable>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>Cancel</CButton>
                    <CButton color="primary" onClick={() => console.log(clientStates)}>Import</CButton>
                </CModalFooter>
            </CModal>

            {editClientIndex !== null && (
                <EditClient
                    showModal={editClientIndex !== null}
                    setShowModal={() => setEditClientIndex(null)}
                    clients={clientStates}
                    activeClient={clientStates[editClientIndex]}
                    onSave={handleSaveClient}
                />
            )}
        </div>
    );
};

export default ImportClients;