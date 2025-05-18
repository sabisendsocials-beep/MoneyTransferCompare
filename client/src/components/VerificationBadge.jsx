import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

/**
 * Component to display verification status badge
 * Shows a green checkmark badge when a rate has been manually verified
 */
export const VerificationBadge = ({ verified, className = "" }) => {
  if (!verified) return null;
  
  return (
    <Badge className={`bg-green-50 text-green-700 border-green-100 flex items-center gap-1 ${className}`}>
      <CheckCircle2 className="h-3 w-3" />
      <span>Verified</span>
    </Badge>
  );
};