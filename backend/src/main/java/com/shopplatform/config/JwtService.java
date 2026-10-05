package com.shopplatform.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

/**
 * Issues and validates JWTs for shop-owner (and later customer) sessions.
 * Subject = account id, "role" claim distinguishes SHOP_OWNER/CUSTOMER so
 * a single filter can authenticate both.
 */
@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                       @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
    }

    public String generateToken(Long subjectId, String role) {
        return generateToken(subjectId, role, Map.of());
    }

    public String generateToken(Long subjectId, String role, Map<String, Object> extraClaims) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
            .subject(String.valueOf(subjectId))
            .claim("role", role);
        extraClaims.forEach(builder::claim);
        return builder
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(expirationMinutes * 60)))
            .signWith(key)
            .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
