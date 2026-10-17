'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';

interface RoleGateProps {
  allowedRoles: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RoleGate renders children only when the authenticated user possesses one of the allowedRoles.
 * SUPER_ADMIN has universal clearance.
 */
export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const { hasRole } = useAuth();

  if (!hasRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default RoleGate;
