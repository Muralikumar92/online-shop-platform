package com.shopplatform.common.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;

/**
 * Uploads shop/product media (logos, item photos, short video reels) to
 * S3. Objects are made available via the bucket's public read policy or a
 * CloudFront distribution in front of it (see infra epic); this service
 * only deals with storing bytes and returning the object's public URL.
 */
@Service
public class S3Service {

    private final S3Client s3Client;
    private final String bucket;
    private final String publicBaseUrl;
    private final String region;

    public S3Service(S3Client s3Client,
                      @Value("${app.aws.s3.bucket}") String bucket,
                      @Value("${app.aws.s3.public-base-url:}") String publicBaseUrl,
                      @Value("${app.aws.region}") String region) {
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.publicBaseUrl = publicBaseUrl;
        this.region = region;
    }

    /**
     * Uploads a file under the given key prefix (e.g. "shops/{shopId}/logo")
     * and returns the public URL to store on the owning entity.
     */
    public String upload(String keyPrefix, MultipartFile file) {
        String extension = extractExtension(file.getOriginalFilename());
        String key = keyPrefix + "/" + UUID.randomUUID() + extension;
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(file.getContentType())
                .build();
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read upload stream for key " + key, e);
        }
        // The global "s3.amazonaws.com" endpoint only resolves correctly for
        // us-east-1 buckets; any other region needs the region-qualified
        // virtual-hosted endpoint, otherwise reads 403/redirect.
        String base = publicBaseUrl.isBlank()
            ? "https://" + bucket + ".s3." + region + ".amazonaws.com"
            : publicBaseUrl;
        return base + "/" + key;
    }

    private String extractExtension(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return dot == -1 ? "" : filename.substring(dot);
    }
}
