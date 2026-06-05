const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'MediReminder AI Backend API',
    version: '1.0.0',
    description: 'Production-ready REST API endpoints for the MediReminder AI platform, including Auth, Medicines, Prescriptions OCR, Reminder Scheduling, Family Adherence, PayU Payments, Admin Panel, and App Settings.',
    contact: {
      name: 'MediReminder AI Developer Team',
      email: 'support@medireminder.ai'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token in format: Bearer <token>'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'An error occurred' },
          errors: { type: 'array', items: { type: 'object' } }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          phone: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          status: { type: 'string', example: 'ACTIVE' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Medicine: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          dosage: { type: 'string', example: '1 tablet' },
          instructions: { type: 'string', example: 'Take after meal' },
          type: { type: 'string', example: 'Tablet' },
          stock: { type: 'integer', example: 30 },
          unit: { type: 'string', example: 'pieces' },
          expiry_date: { type: 'string', format: 'date' }
        }
      },
      ReminderSchedule: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          medicine_id: { type: 'string', format: 'uuid' },
          reminder_time: { type: 'string', example: '08:30:00' },
          days_of_week: { type: 'array', items: { type: 'integer' }, example: [1, 2, 3, 4, 5, 6, 7] },
          is_active: { type: 'boolean', example: true }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/api/auth/otp/send': {
      post: {
        summary: 'Send OTP to mobile number',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: {
                  phone: { type: 'string', example: '+919876543210' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'OTP sent successfully (Simulated OTP returned if in test mode)'
          }
        }
      }
    },
    '/api/auth/otp/verify': {
      post: {
        summary: 'Verify OTP and issue JWT token',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'otp'],
                properties: {
                  phone: { type: 'string', example: '+919876543210' },
                  otp: { type: 'string', example: '123456' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'OTP verified successfully, returns JWT token'
          }
        }
      }
    },
    '/api/auth/google': {
      post: {
        summary: 'Google OAuth Sign-in',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken'],
                properties: {
                  idToken: { type: 'string', example: 'google-oauth-id-token' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Google authenticated successfully'
          }
        }
      }
    },
    '/api/auth/apple': {
      post: {
        summary: 'Apple OAuth Sign-in',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identityToken'],
                properties: {
                  identityToken: { type: 'string', example: 'apple-oauth-identity-token' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Apple authenticated successfully'
          }
        }
      }
    },
    '/api/medicines': {
      get: {
        summary: 'Get all medicines for the logged in user',
        tags: ['Medicines'],
        responses: {
          200: {
            description: 'List of medicines'
          }
        }
      },
      post: {
        summary: 'Create a new medicine entry',
        tags: ['Medicines'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Medicine'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Medicine created successfully'
          }
        }
      }
    },
    '/api/medicines/{id}': {
      get: {
        summary: 'Get medicine details by ID',
        tags: ['Medicines'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Medicine details' }
        }
      },
      put: {
        summary: 'Update existing medicine info',
        tags: ['Medicines'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Medicine' } } }
        },
        responses: {
          200: { description: 'Medicine updated' }
        }
      },
      delete: {
        summary: 'Delete a medicine entry',
        tags: ['Medicines'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Medicine deleted' }
        }
      }
    },
    '/api/prescriptions/upload': {
      post: {
        summary: 'Upload prescription image/PDF, run Gemini OCR & check drug interactions',
        tags: ['Prescriptions'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary', description: 'PDF or Image prescription file' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'File processed. Extracted medicines with safety warnings returned.'
          }
        }
      }
    },
    '/api/reminders': {
      get: {
        summary: 'Get all schedules & statuses',
        tags: ['Reminders'],
        responses: {
          200: { description: 'List of reminder schedules' }
        }
      },
      post: {
        summary: 'Schedule a new medicine reminder',
        tags: ['Reminders'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReminderSchedule' } } }
        },
        responses: {
          201: { description: 'Reminder created successfully' }
        }
      }
    },
    '/api/reminders/{id}': {
      put: {
        summary: 'Update reminder timing or state',
        tags: ['Reminders'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReminderSchedule' } } }
        },
        responses: {
          200: { description: 'Reminder updated' }
        }
      },
      delete: {
        summary: 'Delete a reminder schedule',
        tags: ['Reminders'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Reminder deleted' }
        }
      }
    },
    '/api/payments/checkout': {
      post: {
        summary: 'Initiate a subscription order and get PayU payment payload with hashes',
        tags: ['Payments'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['planName', 'amount'],
                properties: {
                  planName: { type: 'string', example: 'Monthly' },
                  amount: { type: 'number', example: 120.00 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'PayU order signature data' }
        }
      }
    },
    '/api/payments/callback': {
      post: {
        summary: 'PayU Webhook IPN Callback for verified payment completions',
        tags: ['Payments'],
        security: [],
        responses: {
          200: { description: 'IPN parsed and verified' }
        }
      }
    },
    '/api/family': {
      get: {
        summary: 'List linked family members',
        tags: ['Family Module'],
        responses: {
          200: { description: 'List of family members' }
        }
      },
      post: {
        summary: 'Add family member for missed dose notifications',
        tags: ['Family Module'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone', 'relationship'],
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  phone: { type: 'string', example: '+919876543210' },
                  email: { type: 'string', example: 'john@example.com' },
                  relationship: { type: 'string', example: 'Father' },
                  notify_on_missed: { type: 'boolean', example: true }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Family member linked' }
        }
      }
    },
    '/api/family/{id}': {
      delete: {
        summary: 'Unlink a family member',
        tags: ['Family Module'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Family member unlinked' }
        }
      }
    },
    '/api/admin/dashboard': {
      get: {
        summary: 'Retrieve operational dashboard statistics (Admin only)',
        tags: ['Admin Panel'],
        responses: {
          200: { description: 'Statistics object' }
        }
      }
    },
    '/api/admin/users': {
      get: {
        summary: 'Retrieve paginated lists of registered users (Admin only)',
        tags: ['Admin Panel'],
        responses: {
          200: { description: 'List of users' }
        }
      }
    },
    '/api/admin/users/{id}/status': {
      put: {
        summary: 'Block/Unblock a user (Admin only)',
        tags: ['Admin Panel'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['ACTIVE', 'BLOCKED'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'User state updated' }
        }
      }
    },
    '/api/admin/settings': {
      get: {
        summary: 'Get system config parameters (Admin only)',
        tags: ['Admin Panel'],
        responses: {
          200: { description: 'System configurations' }
        }
      },
      put: {
        summary: 'Update subscription details or system keys (Admin only)',
        tags: ['Admin Panel'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  maintenance_mode: { type: 'string', example: 'false' },
                  app_version: { type: 'string', example: '1.0.1' },
                  price_per_day: { type: 'string', example: '6.00' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'System configuration updated' }
        }
      }
    }
  }
};

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(swaggerSpec),
  swaggerSpec
};
