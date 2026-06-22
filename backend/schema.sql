-- Supabase Schema for Invoice Management SaaS

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role text not null default 'admin',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- COMPANY SETTINGS TABLE
create table public.company_settings (
  id uuid references auth.users on delete cascade primary key,
  company_name text not null default 'My Company',
  gst_number text,
  email text,
  phone text,
  website text,
  address text,
  logo_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CUSTOMERS TABLE
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  email text not null,
  phone text,
  gst_number text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INVOICES TABLE
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  invoice_number text not null,
  customer_id uuid references public.customers(id) on delete restrict not null,
  invoice_date date not null default current_date,
  subtotal numeric(12, 2) not null default 0.00,
  gst_amount numeric(12, 2) not null default 0.00,
  total_amount numeric(12, 2) not null default 0.00,
  paid_amount numeric(12, 2) not null default 0.00,
  status text not null default 'pending', -- 'paid', 'pending', 'cancelled'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate invoice numbers for the same user
  constraint unique_invoice_num_per_user unique (user_id, invoice_number)
);

-- INVOICE ITEMS TABLE
create table public.invoice_items (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  program_name text not null,
  description text,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null default 0.00,
  gst_percentage numeric(5, 2) not null default 18.00, -- e.g. 18.00 for 18%
  gst_amount numeric(12, 2) not null default 0.00,
  total_amount numeric(12, 2) not null default 0.00
);

-- ENABLE ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.company_settings enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

-- RLS POLICIES

-- Profiles: Users can read/write their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Company Settings: Users can view/modify their own company settings
create policy "Users can view own company settings" on public.company_settings
  for select using (auth.uid() = id);

create policy "Users can update own company settings" on public.company_settings
  for update using (auth.uid() = id);

create policy "Users can insert own company settings" on public.company_settings
  for insert with check (auth.uid() = id);

-- Customers: Users can manage their own customers
create policy "Users can view own customers" on public.customers
  for select using (auth.uid() = user_id);

create policy "Users can insert own customers" on public.customers
  for insert with check (auth.uid() = user_id);

create policy "Users can update own customers" on public.customers
  for update using (auth.uid() = user_id);

create policy "Users can delete own customers" on public.customers
  for delete using (auth.uid() = user_id);

-- Invoices: Users can manage their own invoices
create policy "Users can view own invoices" on public.invoices
  for select using (auth.uid() = user_id);

create policy "Users can insert own invoices" on public.invoices
  for insert with check (auth.uid() = user_id);

create policy "Users can update own invoices" on public.invoices
  for update using (auth.uid() = user_id);

create policy "Users can delete own invoices" on public.invoices
  for delete using (auth.uid() = user_id);

-- Invoice Items: Users can manage items if they own the parent invoice
create policy "Users can view own invoice items" on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices
      where public.invoices.id = public.invoice_items.invoice_id
      and public.invoices.user_id = auth.uid()
    )
  );

create policy "Users can insert own invoice items" on public.invoice_items
  for insert with check (
    exists (
      select 1 from public.invoices
      where public.invoices.id = public.invoice_items.invoice_id
      and public.invoices.user_id = auth.uid()
    )
  );

create policy "Users can update own invoice items" on public.invoice_items
  for update using (
    exists (
      select 1 from public.invoices
      where public.invoices.id = public.invoice_items.invoice_id
      and public.invoices.user_id = auth.uid()
    )
  );

create policy "Users can delete own invoice items" on public.invoice_items
  for delete using (
    exists (
      select 1 from public.invoices
      where public.invoices.id = public.invoice_items.invoice_id
      and public.invoices.user_id = auth.uid()
    )
  );

-- TRIGGERS TO AUTOMATICALLY CREATE PROFILE & DEFAULT SETTINGS
-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Create user profile
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'admin');

  -- Create default company settings
  insert into public.company_settings (id, company_name, email)
  values (new.id, 'My Company', new.email);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users sign up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
