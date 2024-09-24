import React from 'react';
import { useLocation } from 'react-router-dom';
import { CContainer, CCard, CCardBody, CCardTitle, CCardSubtitle } from '@coreui/react-pro';

const ClientStatementsPage = () => {
    const location = useLocation();
    const { client } = location.state;

    return (
        <CContainer>
            <CCard style={{ width: '18rem', margin: 'auto', marginTop: '2rem' }}>
                <CCardBody>
                    <CCardTitle>{client.firstName} {client.lastName}</CCardTitle>
                    <CCardSubtitle className="mb-2 text-body-secondary">{client.cid}</CCardSubtitle>
                </CCardBody>
            </CCard>
        </CContainer>
    );
};

export default ClientStatementsPage;