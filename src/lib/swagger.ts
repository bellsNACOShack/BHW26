export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Interlog SIWES API",
    version: "1.0.0",
    description:
      "Digital SIWES Management and Verification Platform backend REST APIs.\n\n" +
      "### Authentication\n" +
      "Most endpoints require a JWT Bearer Token. Click **Authorize** below and paste the token returned from `/api/auth/login` or `/api/auth/register` (format: `Bearer <token>`).\n\n" +
      "### Database Configuration\n" +
      "Make sure you have populated `.env.local` with your Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`) and run `supabase/schema.sql` in your Supabase SQL Editor.",
    contact: {
      name: "Interlog Support",
    },
  },
  servers: [
    {
      url: "/",
      description: "Current Host",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token (e.g. from /api/auth/login)",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Bad Request" },
          message: { type: "string", example: "Invalid input provided" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          full_name: { type: "string" },
          role: {
            type: "string",
            enum: [
              "student",
              "workplace_supervisor",
              "academic_supervisor",
              "administrator",
              "itf_verifier",
            ],
          },
          avatar_url: { type: "string", nullable: true },
          phone_number: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      StudentProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          user_id: { type: "string", format: "uuid" },
          matric_number: { type: "string" },
          institution: { type: "string" },
          department: { type: "string" },
          program: { type: "string" },
          level: { type: "string", example: "400L" },
        },
      },
      Placement: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          student_id: { type: "string", format: "uuid" },
          organization_name: { type: "string" },
          organization_address: { type: "string" },
          start_date: { type: "string", format: "date" },
          end_date: { type: "string", format: "date" },
          workplace_supervisor_id: { type: "string", format: "uuid", nullable: true },
          academic_supervisor_id: { type: "string", format: "uuid", nullable: true },
          acceptance_letter_url: { type: "string", nullable: true },
          scaf_status: {
            type: "string",
            enum: ["pending", "printed", "submitted_to_itf", "verified"],
          },
          status: {
            type: "string",
            enum: ["pending", "active", "completed", "terminated"],
          },
          created_at: { type: "string", format: "date-time" },
        },
      },
      LogEntry: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          student_id: { type: "string", format: "uuid" },
          placement_id: { type: "string", format: "uuid" },
          week_number: { type: "integer", example: 1 },
          start_date: { type: "string", format: "date" },
          end_date: { type: "string", format: "date" },
          activities: { type: "string" },
          skills: { type: "string", nullable: true },
          tools: { type: "string", nullable: true },
          challenges: { type: "string", nullable: true },
          remarks: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["draft", "submitted", "under_review", "approved", "rejected", "locked"],
          },
          record_hash: { type: "string", nullable: true, description: "SHA-256 integrity hash once locked" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Diagnostics & Health"],
        summary: "Check backend and Supabase database connection health",
        responses: {
          "200": {
            description: "System is healthy and database is connected",
          },
          "503": {
            description: "Database connection failed or unconfigured",
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user account (Student, Supervisor, Admin, ITF)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "full_name", "role"],
                properties: {
                  email: { type: "string", format: "email", example: "student@example.edu.ng" },
                  password: { type: "string", minLength: 6, example: "Password123!" },
                  full_name: { type: "string", example: "Chinedu Okafor" },
                  role: {
                    type: "string",
                    enum: [
                      "student",
                      "workplace_supervisor",
                      "academic_supervisor",
                      "administrator",
                      "itf_verifier",
                    ],
                    example: "student",
                  },
                  phone_number: { type: "string", example: "+2348012345678" },
                  matric_number: { type: "string", description: "Required if role is student", example: "2019/12345" },
                  institution: { type: "string", description: "Required if role is student", example: "Bells University of Technology" },
                  department: { type: "string", description: "Required if role is student", example: "Computer Science" },
                  program: { type: "string", description: "Required if role is student", example: "B.Sc Software Engineering" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User registered successfully" },
          "400": { description: "Validation error or email already in use" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Authenticate user and receive JWT Bearer token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "student@example.edu.ng" },
                  password: { type: "string", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful with token and profile" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current authenticated user profile and roles",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "User profile returned" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/auth/passkey/register-challenge": {
      post: {
        tags: ["Authentication & Passkeys"],
        summary: "Generate a WebAuthn registration challenge for supervisor passkey / biometric signature",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Challenge generated successfully" },
        },
      },
    },
    "/api/auth/passkey/register-verify": {
      post: {
        tags: ["Authentication & Passkeys"],
        summary: "Verify and store registered passkey credential",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["credential_id", "public_key", "challenge"],
                properties: {
                  credential_id: { type: "string", example: "cred-abc-123" },
                  public_key: { type: "string", example: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE..." },
                  challenge: { type: "string" },
                  device_type: { type: "string", example: "TouchID / FaceID" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Passkey registered" },
        },
      },
    },
    "/api/placements": {
      get: {
        tags: ["Placements & SCAF"],
        summary: "List placements for current user or all if administrator",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "List of placements" },
        },
      },
      post: {
        tags: ["Placements & SCAF"],
        summary: "Create a SIWES placement record with letter of acceptance (Student only)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["organization_name", "organization_address", "start_date", "end_date"],
                properties: {
                  organization_name: { type: "string", example: "Chevron Nigeria Limited" },
                  organization_address: { type: "string", example: "2 Chevron Drive, Lekki, Lagos" },
                  start_date: { type: "string", format: "date", example: "2026-05-01" },
                  end_date: { type: "string", format: "date", example: "2026-10-31" },
                  acceptance_letter_url: { type: "string", example: "https://example.com/letters/acceptance.pdf" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Placement created" },
        },
      },
    },
    "/api/placements/{id}": {
      get: {
        tags: ["Placements & SCAF"],
        summary: "Get placement details by ID",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Placement details" },
          "404": { description: "Placement not found" },
        },
      },
      put: {
        tags: ["Placements & SCAF"],
        summary: "Update placement details",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  organization_name: { type: "string" },
                  organization_address: { type: "string" },
                  acceptance_letter_url: { type: "string" },
                  status: { type: "string", enum: ["pending", "active", "completed", "terminated"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Placement updated" },
        },
      },
    },
    "/api/placements/{id}/assign": {
      put: {
        tags: ["Placements & SCAF"],
        summary: "Assign workplace and academic supervisors to placement (Admin or Supervisor)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  workplace_supervisor_id: { type: "string", format: "uuid" },
                  academic_supervisor_id: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Supervisors assigned successfully" },
        },
      },
    },
    "/api/placements/{id}/scaf": {
      put: {
        tags: ["Placements & SCAF"],
        summary: "Update SCAF form workflow status (pending -> printed -> submitted_to_itf -> verified)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["scaf_status"],
                properties: {
                  scaf_status: {
                    type: "string",
                    enum: ["pending", "printed", "submitted_to_itf", "verified"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "SCAF status updated" },
        },
      },
    },
    "/api/logs": {
      get: {
        tags: ["Weekly Log Entries"],
        summary: "List weekly log entries with optional filters (placement_id, status, week_number)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "placement_id", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "week_number", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "List of log entries" },
        },
      },
      post: {
        tags: ["Weekly Log Entries"],
        summary: "Create a new weekly log entry (in Draft status)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["placement_id", "week_number", "start_date", "end_date", "activities"],
                properties: {
                  placement_id: { type: "string", format: "uuid" },
                  week_number: { type: "integer", example: 1 },
                  start_date: { type: "string", format: "date", example: "2026-05-04" },
                  end_date: { type: "string", format: "date", example: "2026-05-08" },
                  activities: { type: "string", example: "Configured cloud infrastructure and deployed microservices." },
                  skills: { type: "string", example: "Docker, Kubernetes, AWS IAM" },
                  tools: { type: "string", example: "VS Code, Terraform, Git" },
                  challenges: { type: "string", example: "Configuring VPC peering and resolving latency issues." },
                  remarks: { type: "string", example: "Tasks completed ahead of schedule." },
                  supporting_evidence_url: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Log entry created in Draft state" },
        },
      },
    },
    "/api/logs/{id}": {
      get: {
        tags: ["Weekly Log Entries"],
        summary: "Get log entry detail by ID",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Log entry detail" },
        },
      },
      put: {
        tags: ["Weekly Log Entries"],
        summary: "Update a log entry (Only allowed in Draft or Rejected status)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  activities: { type: "string" },
                  skills: { type: "string" },
                  tools: { type: "string" },
                  challenges: { type: "string" },
                  remarks: { type: "string" },
                  supporting_evidence_url: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Log entry updated" },
          "400": { description: "Cannot edit an entry that is locked or under review" },
        },
      },
      delete: {
        tags: ["Weekly Log Entries"],
        summary: "Delete a log entry (Only allowed if in Draft state)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Draft entry deleted" },
        },
      },
    },
    "/api/logs/{id}/submit": {
      post: {
        tags: ["Weekly Log Entries"],
        summary: "Submit draft or rejected log entry for supervisor review (Draft/Rejected -> Submitted)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Entry submitted for review" },
        },
      },
    },
    "/api/logs/{id}/review": {
      post: {
        tags: ["Supervisor Reviews & Signatures"],
        summary: "Supervisor reviews a submitted log entry (Approve or Reject with feedback comments)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: {
                    type: "string",
                    enum: ["approve", "reject", "request_changes"],
                    example: "approve",
                  },
                  comments: {
                    type: "string",
                    example: "Excellent documentation and technical depth demonstrated.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Review recorded successfully" },
        },
      },
    },
    "/api/logs/{id}/sign": {
      post: {
        tags: ["Supervisor Reviews & Signatures"],
        summary: "Apply digital signature/passkey sign-off and permanently lock the log record with SHA-256 integrity hash",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["signature_reference"],
                properties: {
                  signature_type: {
                    type: "string",
                    enum: ["passkey", "digital_pin", "crypto_ecdsa"],
                    default: "passkey",
                  },
                  signature_reference: {
                    type: "string",
                    description: "Cryptographic signature or device authentication assertion",
                    example: "passkey-assert-eyJhbGciOiJFUzI1NiJ9...",
                  },
                  passkey_credential_id: { type: "string", example: "cred-abc-123" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Signature applied, SHA-256 hash computed, and record locked",
          },
        },
      },
    },
    "/api/verifications/generate": {
      post: {
        tags: ["Verification & Document Integrity"],
        summary: "Generate a unique SIWES verification code and cryptographic digest for a completed placement",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["placement_id"],
                properties: {
                  placement_id: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Verification record generated" },
        },
      },
    },
    "/api/verifications/{code}": {
      get: {
        tags: ["Verification & Document Integrity"],
        summary: "Public verification lookup for ITF, employers, and institutions (No authentication required)",
        parameters: [
          { name: "code", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Verification details and integrity check result" },
          "404": { description: "Invalid or nonexistent verification code" },
        },
      },
    },
    "/api/audit-logs": {
      get: {
        tags: ["Audit Trail & Dashboard"],
        summary: "Query tamper-evident audit logs (Admins & Supervisors)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "resource_type", in: "query", schema: { type: "string" } },
          { name: "resource_id", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": { description: "Audit records returned" },
        },
      },
    },
    "/api/dashboard/stats": {
      get: {
        tags: ["Audit Trail & Dashboard"],
        summary: "Get aggregated dashboard statistics tailored to the authenticated user's role",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Dashboard summary statistics" },
        },
      },
    },
  },
};
