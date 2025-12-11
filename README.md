# CRM - Client Management Platform

A comprehensive, full-featured Client Relationship Management (CRM) platform built with modern web technologies. This application helps businesses manage their clients, invoices, estimates, proposals, and communications all in one place.

## 🚀 Features

### Client Management
- **Complete Client Database**: Store and manage client information including contact details, company info, and notes
- **Client Activity Tracking**: View all invoices, estimates, and messages associated with each client
- **Advanced Search & Filtering**: Quickly find clients with powerful search capabilities

### Financial Management
- **Invoice Management**: 
  - Create, edit, and track invoices with multiple statuses (Draft, Sent, Paid, Overdue, Cancelled)
  - Support for recurring invoices (Weekly, Monthly, Annual)
  - Itemized billing with quantity, price, and tax calculations
  - Multi-currency support
  
- **Estimates & Quotes**:
  - Generate professional estimates for potential projects
  - Track estimate status (Draft, Sent, Accepted, Rejected)
  - Convert accepted estimates to invoices
  - Set expiry dates for time-sensitive quotes

### Proposals
- **Professional Proposals**: Create and manage business proposals with rich HTML/Markdown content
- **Status Tracking**: Monitor proposal lifecycle from draft to completion
- **Template System**: Use customizable templates for consistent branding

### Communication Center
- **Multi-Channel Messaging**:
  - SMS messaging integration
  - Email communication
  - WhatsApp business messaging
  
- **Provider Flexibility**:
  - SMS: Twilio, eSMS
  - Email: Gmail, SMTP
  - WhatsApp: WAACS, WhatsCloud, Official WhatsApp Business API
  
- **Message History**: Track all inbound and outbound communications with delivery status

### Templates
- **Customizable Templates** for:
  - Invoices
  - Estimates
  - Email communications
  - SMS messages
  - WhatsApp messages
  - Proposals
  
- **Default Templates**: Set default templates for quick document generation

### User Management
- **Role-Based Access**: Admin and User roles for team collaboration
- **Secure Authentication**: JWT-based authentication system
- **User Profiles**: Manage user information and permissions

## 🛠️ Technology Stack

### Frontend
- **React** - Modern UI library
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API requests

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **TypeScript** - Type-safe JavaScript
- **Prisma ORM** - Modern database toolkit
- **PostgreSQL** - Robust relational database

### Security
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **CORS** - Cross-origin resource sharing

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CRM
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**
   
   Create `.env` files in both `client` and `server` directories:
   
   **Server (.env)**:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/crm_db"
   JWT_SECRET="your-secret-key"
   PORT=5000
   ```
   
   **Client (.env)**:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

4. **Set up the database**
   ```bash
   npm run prisma:push
   npm run prisma:generate
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start both the backend server and frontend client concurrently.

## 🚀 Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run dev:server` - Start only the backend server
- `npm run dev:client` - Start only the frontend client
- `npm run build` - Build the client for production
- `npm run start` - Start the production server
- `npm run install:all` - Install dependencies for root, client, and server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:push` - Push database schema changes

## 📁 Project Structure

```
CRM/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
│
├── server/                # Backend Node.js application
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Utility functions
│   └── prisma/
│       └── schema.prisma  # Database schema
│
└── package.json           # Root package configuration
```

## 🔒 Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Protected API routes
- Role-based access control
- Encrypted provider credentials
- CORS protection

## 🌐 API Endpoints

The application provides RESTful API endpoints for:
- User authentication (`/api/auth`)
- Client management (`/api/clients`)
- Invoice operations (`/api/invoices`)
- Estimate handling (`/api/estimates`)
- Proposal management (`/api/proposals`)
- Template operations (`/api/templates`)
- Message center (`/api/messages`)
- Provider configuration (`/api/providers`)

## 📝 Database Schema

The application uses PostgreSQL with the following main entities:
- **Users** - System users with authentication
- **Clients** - Customer information
- **Invoices** - Billing documents with recurring support
- **Estimates** - Quote documents
- **Proposals** - Business proposals
- **Templates** - Document templates
- **Messages** - Communication history
- **ProviderConfig** - Third-party service configurations

## 🤝 Contributing

Contributions are welcome! This is an open-source project designed to help businesses manage their client relationships more effectively.

## 💖 Support This Project

If you find this CRM platform useful and would like to support its development, you can make a donation:

**[Support via Stripe](https://buy.stripe.com/3cI28se757NL7Xn87vcfK04)**

Your support helps maintain and improve this project, add new features, and keep it free and open-source for everyone.

## 📄 License

This project is open source and available for public use.

## 🐛 Bug Reports & Feature Requests

If you encounter any issues or have suggestions for new features, please open an issue on the project repository.

## 📧 Contact

For questions or support, please reach out through the project's issue tracker.

---

**Built with ❤️ for businesses that value efficient client management**
