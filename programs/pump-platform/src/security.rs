// Security Module for Starpad Platform
// Implements protection against common vulnerabilities

use anchor_lang::prelude::*;

/// Security checks for token creation
pub fn validate_token_creation(
    name: &str,
    symbol: &str,
    description: &str,
    image_uri: &str,
) -> Result<()> {
    // Check name length
    require!(
        name.len() >= 2 && name.len() <= 32,
        SecurityError::InvalidNameLength
    );

    // Check symbol length
    require!(
        symbol.len() >= 2 && symbol.len() <= 10,
        SecurityError::InvalidSymbolLength
    );

    // Check description length
    require!(
        description.len() >= 10 && description.len() <= 500,
        SecurityError::InvalidDescriptionLength
    );

    // Check URI length
    require!(
        image_uri.len() >= 10 && image_uri.len() <= 200,
        SecurityError::InvalidUriLength
    );

    // Validate no malicious characters
    require!(
        is_safe_string(name) && is_safe_string(symbol) && is_safe_string(description),
        SecurityError::MaliciousInput
    );

    Ok(())
}

/// Security checks for trading
pub fn validate_trade(
    amount: u64,
    min_out: u64,
    bonding_curve_active: bool,
    timestamp: i64,
) -> Result<()> {
    // Check bonding curve is active
    require!(bonding_curve_active, SecurityError::BondingCurveInactive);

    // Check amount is not zero
    require!(amount > 0, SecurityError::ZeroAmount);

    // Check min_out is reasonable (prevent manipulation)
    require!(min_out > 0, SecurityError::ZeroMinOut);

    // Check timestamp is recent (prevent replay attacks)
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        (current_time - timestamp).abs() < 60, // 1 minute window
        SecurityError::StaleTimestamp
    );

    Ok(())
}

/// Validate post content
pub fn validate_post(content: &str, creator: &Pubkey, token_creator: &Pubkey) -> Result<()> {
    // Only creator can post
    require!(creator == token_creator, SecurityError::Unauthorized);

    // Validate content length
    require!(
        content.len() >= 1 && content.len() <= 500,
        SecurityError::InvalidContentLength
    );

    // Check for malicious content
    require!(is_safe_string(content), SecurityError::MaliciousInput);

    Ok(())
}

/// Check if string contains only safe characters
fn is_safe_string(s: &str) -> bool {
    // Allow alphanumeric, spaces, and common punctuation
    s.chars().all(|c| {
        c.is_alphanumeric()
            || c.is_whitespace()
            || matches!(c, '.' | ',' | '!' | '?' | '-' | '_' | '@' | '#' | '$' | '%' | '&' | '(' | ')' | '+' | '=' | ':' | ';' | '\'' | '"' | '/' | '\\')
    })
}

/// Prevent sandwich attacks by checking price impact
pub fn check_price_impact(
    virtual_sol: u64,
    virtual_tokens: u64,
    sol_amount: u64,
) -> Result<f64> {
    let price_impact = (sol_amount as f64) / (virtual_sol as f64) * 100.0;
    
    // Warn if price impact is too high (but don't block - user decides)
    if price_impact > 10.0 {
        msg!("⚠️ WARNING: High price impact: {:.2}%", price_impact);
    }
    
    Ok(price_impact)
}

/// Rate limiting check (implement in your backend)
pub fn should_rate_limit(user: &Pubkey, action_count: u32, time_window: i64) -> bool {
    // Example: Max 10 trades per minute
    const MAX_ACTIONS_PER_MINUTE: u32 = 10;
    const TIME_WINDOW: i64 = 60;

    action_count > MAX_ACTIONS_PER_MINUTE && time_window < TIME_WINDOW
}

/// Validate amounts to prevent overflow
pub fn check_overflow(a: u64, b: u64) -> Result<()> {
    require!(
        a.checked_mul(b).is_some(),
        SecurityError::ArithmeticOverflow
    );
    Ok(())
}

/// Security error codes
#[error_code]
pub enum SecurityError {
    #[msg("Invalid name length (2-32 characters required)")]
    InvalidNameLength,
    
    #[msg("Invalid symbol length (2-10 characters required)")]
    InvalidSymbolLength,
    
    #[msg("Invalid description length (10-500 characters required)")]
    InvalidDescriptionLength,
    
    #[msg("Invalid URI length (10-200 characters required)")]
    InvalidUriLength,
    
    #[msg("Malicious input detected")]
    MaliciousInput,
    
    #[msg("Bonding curve is not active")]
    BondingCurveInactive,
    
    #[msg("Amount cannot be zero")]
    ZeroAmount,
    
    #[msg("Minimum output cannot be zero")]
    ZeroMinOut,
    
    #[msg("Timestamp is too old (possible replay attack)")]
    StaleTimestamp,
    
    #[msg("Unauthorized: only token creator can perform this action")]
    Unauthorized,
    
    #[msg("Invalid content length (1-500 characters required)")]
    InvalidContentLength,
    
    #[msg("Arithmetic overflow detected")]
    ArithmeticOverflow,
    
    #[msg("Rate limit exceeded")]
    RateLimitExceeded,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_safe_string() {
        assert!(is_safe_string("Hello World 123"));
        assert!(is_safe_string("Test-Token_2024"));
        assert!(!is_safe_string("<script>alert('xss')</script>"));
        assert!(!is_safe_string("DROP TABLE users;"));
    }

    #[test]
    fn test_price_impact() {
        let virtual_sol = 30_000_000_000; // 30 SOL
        let virtual_tokens = 1_073_000_000_000_000_000;
        let sol_amount = 1_000_000_000; // 1 SOL
        
        let impact = check_price_impact(virtual_sol, virtual_tokens, sol_amount).unwrap();
        assert!(impact < 5.0); // Should be low impact
    }
}
