package com.shopplatform.common.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;
import software.amazon.awssdk.services.sesv2.model.SesV2Exception;

/**
 * AWS SES-backed {@link EmailService}, active only under the "prod" Spring
 * profile (see docker-compose.prod.yml's {@code SPRING_PROFILES_ACTIVE}).
 * Uses the AWS SDK directly (not SES's SMTP interface) so it needs only the
 * EC2 instance's IAM role to be granted {@code ses:SendEmail} - no separate
 * SMTP credentials to generate/rotate.
 *
 * Requires the sender identity ({@code app.mail.from}, e.g.
 * no-reply@myshops.com) to be a verified SES identity in the target AWS
 * account/region, and the account to have been moved out of the SES sandbox
 * (otherwise SES refuses to deliver to any recipient that isn't also
 * verified) - see DEPLOYMENT.md.
 */
@Service
@Profile("prod")
public class SesEmailService implements EmailService {

    private final SesV2Client sesClient;
    private final String fromAddress;

    public SesEmailService(SesV2Client sesClient, @Value("${app.mail.from}") String fromAddress) {
        this.sesClient = sesClient;
        this.fromAddress = fromAddress;
    }

    @Override
    public void send(String to, String subject, String body) {
        SendEmailRequest request = SendEmailRequest.builder()
            .fromEmailAddress(fromAddress)
            .destination(Destination.builder().toAddresses(to).build())
            .content(EmailContent.builder()
                .simple(Message.builder()
                    .subject(Content.builder().data(subject).build())
                    .body(Body.builder().text(Content.builder().data(body).build()).build())
                    .build())
                .build())
            .build();
        try {
            sesClient.sendEmail(request);
        } catch (SesV2Exception e) {
            throw new IllegalStateException("Failed to send email via SES to " + to, e);
        }
    }
}
