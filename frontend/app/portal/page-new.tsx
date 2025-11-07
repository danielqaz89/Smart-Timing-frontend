"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CompanyProvider } from "../../contexts/CompanyContext";
import PortalLayout from '../../components/PortalLayout';

export default function PortalPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/portal/dashboard');
  }, [router]);

  return (
    <CompanyProvider>
      <PortalLayout>
        <div>Redirecting...</div>
      </PortalLayout>
    </CompanyProvider>
  );
}
