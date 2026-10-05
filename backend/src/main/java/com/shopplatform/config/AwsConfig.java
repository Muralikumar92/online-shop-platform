package com.shopplatform.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.sesv2.SesV2Client;

@Configuration
public class AwsConfig {

    @Bean
    public S3Client s3Client(@Value("${app.aws.region}") String region) {
        return S3Client.builder()
            .region(Region.of(region))
            .build();
    }

    /**
     * SES is only usable in a subset of AWS regions, so the SES region is
     * configurable independently of the S3/app region (falls back to it by
     * default - see {@code app.aws.ses.region} in application.properties).
     * Credentials come from the default provider chain (EC2 instance role in
     * prod, local ~/.aws profile in dev) - this bean is only ever exercised
     * by {@code SesEmailService}, which is itself only active in the "prod"
     * profile, so no SES permissions are required for local development.
     */
    @Bean
    public SesV2Client sesV2Client(@Value("${app.aws.ses.region}") String sesRegion) {
        return SesV2Client.builder()
            .region(Region.of(sesRegion))
            .build();
    }
}
