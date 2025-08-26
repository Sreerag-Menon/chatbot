# Authentication Setup

This project uses NextAuth.js for authentication. Follow these steps to set up the required environment variables.

## Environment Variables

Create a `.env.local` file in the root of your project and add the following variables:

```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Database (Prisma)
DATABASE_URL=your-database-connection-string
```

### Generating NEXTAUTH_SECRET

You can generate a secure secret using the following command:

```bash
openssl rand -base64 32
```

## Database Setup

1. Make sure you have a PostgreSQL database set up
2. Update the `DATABASE_URL` in your `.env.local` file
3. Run the database migrations:

```bash
npx prisma migrate dev
```

## Authentication Flow

- Users can sign up with email/password
- Admin users need an admin code (default: `admin123`)
- Sessions are stored in HTTP-only cookies
- JWT tokens are used for authentication

## Role-Based Access Control

- `admin`: Can access all routes including `/admin`
- `employee`: Can only access non-admin routes

## Development

To run the development server:

```bash
npm run dev
```

Visit [http://localhost:3000/login](http://localhost:3000/login) to access the login page.
