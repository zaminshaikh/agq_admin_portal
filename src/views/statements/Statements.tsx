import React from 'react';
import { CContainer } from "@coreui/react-pro";
import { Routes, Route } from 'react-router-dom';
import StatementsUsersButtons from './components/StatementsUsersButtons';
import ClientStatementsPage from './components/ClientStatementsPage';

const Statements: React.FC = () => {
  return (
    <CContainer>
        <ClientStatementsPage/>
    </CContainer>
  );
};

export default Statements;