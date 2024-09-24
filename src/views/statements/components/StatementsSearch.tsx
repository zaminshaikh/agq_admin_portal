import React from 'react';
import { CInputGroup, CFormInput, CInputGroupText } from "@coreui/react-pro";

const StatementsSearch: React.FC = () => {
    return (
        <CInputGroup className="mb-3">
            <CInputGroupText>@</CInputGroupText>
            <CFormInput placeholder="Search for clients..." />
        </CInputGroup>
    );
};

export default StatementsSearch;