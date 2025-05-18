# Rate Verification Implementation Guide

## Overview
This guide provides instructions for implementing the rate verification feature in the application. This feature allows admin users to verify if auto-captured rates are accurate, and displays verification badges on the comparison results page.

## 1. Backend Implementation

### Add Verification API Endpoint
Add these endpoints to `server/routes.ts` or your existing API router:

```javascript
// Rate verification endpoints

/**
 * POST /api/rates/verify
 * Verify or unverify a rate
 */
apiRouter.post("/api/rates/verify", async (req, res) => {
  try {
    const { rateId, verified } = req.body;
    
    if (!rateId) {
      return res.status(400).json({
        success: false,
        message: 'Rate ID is required'
      });
    }
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Verified status must be a boolean'
      });
    }
    
    // Update verification status directly in the database
    const [updatedRate] = await db
      .update(exchangeRates)
      .set({ 
        verified,
        timestamp: new Date() // Update timestamp to show it was verified recently
      })
      .where(eq(exchangeRates.id, rateId))
      .returning();
    
    if (!updatedRate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }
    
    return res.json({
      success: true,
      message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
      rate: updatedRate
    });
  } catch (error) {
    console.error(`Error verifying rate: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update rate verification status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/rates/verified
 * Get all verified rates
 */
apiRouter.get("/api/rates/verified", async (_req, res) => {
  try {
    const verifiedRates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.verified, true))
      .orderBy(desc(exchangeRates.timestamp));
    
    return res.json(verifiedRates);
  } catch (error) {
    console.error(`Error fetching verified rates: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch verified rates',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
```

## 2. Frontend Implementation

### Add Verification Badge Component
Create a new component for displaying verification status:

```jsx
// client/src/components/VerificationBadge.jsx
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export const VerificationBadge = ({ verified, className = "" }) => {
  if (!verified) return null;
  
  return (
    <Badge className={`bg-green-50 text-green-700 border-green-100 flex items-center gap-1 ${className}`}>
      <CheckCircle2 className="h-3 w-3" />
      <span>Verified</span>
    </Badge>
  );
};
```

### Update the Admin Page
Modify the LatestRatesTable component in the Admin page to include verification functionality:

```jsx
// client/src/pages/AdminPage.tsx

// Add this to your imports
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Add this to your LatestRatesTable component
const verifyRateMutation = useMutation({
  mutationFn: async ({ rateId, verified }) => {
    const response = await fetch('/api/rates/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rateId, verified })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update verification status');
    }
    
    return await response.json();
  },
  onSuccess: () => {
    toast({
      title: "Verification status updated",
      description: "The rate verification status has been updated",
    });
    refetch(); // Refresh the rates data
  },
  onError: (error) => {
    toast({
      title: "Error updating verification",
      description: error instanceof Error ? error.message : "An unknown error occurred",
      variant: "destructive",
    });
  }
});

// Add verification status to your table headers
<TableHead>Verified</TableHead>
<TableHead>Actions</TableHead>

// Add verification columns to your table rows
<TableCell>
  {rate.verified ? (
    <Badge className="bg-green-100 text-green-800 border-0">Verified</Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-800 border-0">Unverified</Badge>
  )}
</TableCell>
<TableCell>
  {rate.verified ? (
    <Button 
      variant="outline" 
      size="sm"
      className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
      onClick={() => verifyRateMutation.mutate({ rateId: rate.id, verified: false })}
      disabled={verifyRateMutation.isPending}
    >
      Unverify
    </Button>
  ) : (
    <Button 
      variant="outline" 
      size="sm"
      className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
      onClick={() => verifyRateMutation.mutate({ rateId: rate.id, verified: true })}
      disabled={verifyRateMutation.isPending}
    >
      Verify
    </Button>
  )}
</TableCell>
```

### Update the Comparison Results Component 
Modify the comparison results to display verification badges:

```jsx
// client/src/components/ComparisonResults.tsx

// Import the VerificationBadge component
import { VerificationBadge } from "@/components/VerificationBadge";

// Add the verification badge to the provider name section
<div className="flex items-center gap-2">
  <h3 className="text-lg font-semibold">{result.providerName}</h3>
  {result.verified && <VerificationBadge verified={true} />}
</div>
```

### Update Transfer Result Type
Add the verified field to the transfer result schema in shared/schema.ts:

```typescript
export const transferResultSchema = z.object({
  // Existing fields...
  verified: z.boolean().optional().default(false), // Whether the rate has been manually verified
});
```

### Update Comparison Endpoint
Add verification status to the comparison results:

```typescript
// In compareTransferOptions function in server/databaseStorage.ts

results.push({
  // Existing fields...
  verified: rate.verified || false, // Include the verification status
});
```

## 3. Performance Optimization

To address the startup performance issues, modify the `package.json` to use an optimized startup process:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx optimized-startup.js"
  }
}
```

This will use the optimized startup file that implements more efficient scheduling:

1. Exchange rate scraping will run on a fixed schedule (3 times/day at 6 AM, 2 PM, 10 PM)
2. TrustPilot ratings will be checked once daily (at 3 AM) and cached for 24 hours
3. API checks for rates will be done on-demand and cached for 1 hour

## 4. Testing the Implementation

After implementing these changes:

1. Start the application and navigate to the Admin page
2. Click on "Latest Provider Rates" to see the table with verification options
3. Click "Verify" for any rate you want to mark as manually verified
4. Navigate to the comparison page and search for a transfer
5. The verified rates should display with a "Verified" badge