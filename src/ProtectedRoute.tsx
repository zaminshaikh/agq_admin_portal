// ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth'; // You may need to install react-firebase-hooks
import { auth } from './App'; // Adjust the path as necessary

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    // auth.signOut();
    const [user, loading, error] = useAuthState(auth);
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>; // Or a spinner component
    }

    if (error) {
        console.error('Error fetching auth state:', error);
    }

    return user ? (
        children
    ) : (
        <Navigate to="/login" state={{ from: location }} replace />
    );
};

export default ProtectedRoute;
