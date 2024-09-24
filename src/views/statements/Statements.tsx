import React from 'react';
import { CContainer } from "@coreui/react-pro";
import StatementsSearch from './components/StatementsSearch';
import StatementsUsersButtons from './components/StatementsUsersButtons';

const Statements: React.FC = () => {

    return (
        <CContainer>
            <StatementsUsersButtons />
        </CContainer>
    );
};

export default Statements;