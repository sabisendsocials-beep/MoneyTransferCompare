# Direct Rate Verification Implementation

This file provides simple, direct code snippets that can be added to your existing project to implement rate verification.

## 1. Server-Side Implementation

### Add to server/routes.ts

```typescript
// Rate verification endpoint (add this to your existing routes.ts file)
app.post("/api/rate-verify", async (req: Request, res: Response) => {
  try {
    const { id, verified } = req.body;
    
    if (!id) {
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
    
    try {
      // Update the rate verification status
      const [updatedRate] = await db
        .update(exchangeRates)
        .set({ 
          verified,
          timestamp: new Date()
        })
        .where(eq(exchangeRates.id, id))
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
      throw new Error(`Failed to update rate: ${error}`);
    }
  } catch (error) {
    console.error(`Error verifying rate: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update rate verification status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
```

## 2. Add Verification Badge Component

### Create client/src/components/VerificationBadge.jsx

```jsx
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
```

## 3. Update Admin Page with Verification Controls

### Add this code to client/src/pages/AdminPage.tsx

```jsx
// Add this mutation to your page
const verifyRateMutation = useMutation({
  mutationFn: async ({ rateId, verified }) => {
    const response = await fetch('/api/rate-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        id: rateId, 
        verified 
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Verification failed: ${errorData.message || 'Unknown error'}`);
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
      description: error.message || "An unknown error occurred",
      variant: "destructive",
    });
  }
});

// In your table row rendering, add these verify/unverify buttons:
<div className="flex items-center space-x-2">
  {rate.verified ? (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => verifyRateMutation.mutate({ rateId: rate.id, verified: false })}
    >
      Unverify
    </Button>
  ) : (
    <Button 
      variant="default" 
      size="sm"
      onClick={() => verifyRateMutation.mutate({ rateId: rate.id, verified: true })}
    >
      Verify
    </Button>
  )}
</div>
```

## 4. Add Verification Badge to Comparison Results

### Update client/src/components/ComparisonResults.tsx

```jsx
// Import the verification badge
import { VerificationBadge } from "@/components/VerificationBadge";

// Add this to your provider card header
<div className="flex items-center gap-2">
  <h3 className="text-lg font-semibold">{result.providerName}</h3>
  {result.verified && <VerificationBadge verified={true} />}
</div>
```

## 5. Testing the Implementation

1. Add the VerificationBadge component
2. Add the verification endpoint to server/routes.ts
3. Update the Admin page with verification controls
4. Test verifying and unverifying rates from the Admin interface
5. Check that verified rates show the badge in comparison results