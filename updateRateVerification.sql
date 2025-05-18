-- SQL file to add rate verification functionality

-- Check if the verified column exists in the exchange_rates table
-- If it doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'exchange_rates' 
        AND column_name = 'verified'
    ) THEN
        ALTER TABLE exchange_rates 
        ADD COLUMN verified BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Create the function to update the verification status of a rate
CREATE OR REPLACE FUNCTION update_rate_verification(rate_id INTEGER, is_verified BOOLEAN)
RETURNS JSONB AS $$
DECLARE
    updated_rate JSONB;
BEGIN
    UPDATE exchange_rates
    SET 
        verified = is_verified,
        timestamp = NOW() -- Update timestamp to show it was recently modified
    WHERE id = rate_id
    RETURNING to_jsonb(exchange_rates.*) INTO updated_rate;
    
    RETURN updated_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a provider has any verified rates for a currency pair
CREATE OR REPLACE FUNCTION has_verified_rates(provider_id INTEGER, from_curr TEXT, to_curr TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_verified BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM exchange_rates 
        WHERE 
            provider_id = $1 AND
            from_currency = $2 AND
            to_currency = $3 AND
            verified = TRUE
        LIMIT 1
    ) INTO has_verified;
    
    RETURN has_verified;
END;
$$ LANGUAGE plpgsql;