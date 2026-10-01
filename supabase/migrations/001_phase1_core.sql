-- PHASE 1 : socle. Exécuter dans Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz default now());

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.companies (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, sector text, size text, country text, is_demo boolean default false, created_at timestamptz default now());

create table public.product_categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, created_at timestamptz default now());

create table public.suppliers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, company_name text, country text, city text, sector text, category text,
  email text, phone text, website text, certifications text[], capacity text,
  moq numeric, currency text default 'MAD', payment_terms text, incoterms text,
  lead_time_days int, unit_price numeric, quality_score numeric, performance_score numeric,
  risk_level text check (risk_level in ('faible','moyen','élevé')),
  status text default 'actif' check (status in ('prospect','actif','suspendu','inactif')),
  source text default 'utilisateur' check (source in ('utilisateur','externe')),
  notes text, is_demo boolean default false, created_at timestamptz default now());

create table public.products (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sku text, name text not null, category_id uuid references public.product_categories(id) on delete set null,
  description text, unit text, unit_cost numeric, moq numeric, lead_time_days int,
  safety_stock numeric, specifications jsonb, is_demo boolean default false, created_at timestamptz default now(),
  unique (user_id, sku));

create table public.learning_modules (
  id serial primary key, year int not null, semester int not null, title text not null, domain text);

create table public.learning_progress (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module_id int not null references public.learning_modules(id) on delete cascade,
  status text not null default 'a_decouvrir' check (status in ('a_decouvrir','en_apprentissage','en_pratique','maitrisee')),
  exercises_done int default 0, updated_at timestamptz default now(), unique (user_id, module_id));

create table public.audit_logs (
  id bigserial primary key, user_id uuid default auth.uid() references auth.users(id) on delete set null,
  action text not null, entity text, entity_id uuid, created_at timestamptz default now());

-- ===== RLS : chacun ne voit que ses données =====
alter table public.profiles enable row level security;
create policy "profil perso" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

do $$ declare t text; begin
  foreach t in array array['companies','product_categories','suppliers','products','learning_progress','audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop; end $$;

alter table public.learning_modules enable row level security;
create policy "modules lecture" on public.learning_modules for select to authenticated using (true);

insert into public.learning_modules(year,semester,title,domain) values
 (1,1,'Analyse des produits et des processus','Achats'),(1,1,'Comptabilité générale','Coûts'),
 (1,1,'Analyse du contexte de l''entreprise','Stratégie'),(1,2,'Environnement juridique des achats','Achats'),
 (1,2,'Environnement normatif des achats','Fournisseurs'),(1,2,'Calcul des coûts de revient','Coûts'),
 (1,2,'Règles et procédures du commerce international','Commerce international'),(1,2,'Étude des indicateurs économiques','Achats'),
 (2,3,'Gestion des approvisionnements et stocks','Stocks'),(2,3,'Techniques de négociation','Négociation'),
 (2,3,'Fondamentaux du Management Achats','Achats'),(2,4,'Analyse des besoins','Achats'),
 (2,4,'Réalisation de la commande','Approvisionnement'),(2,4,'Étude du marché relatif au besoin','Sourcing'),
 (2,4,'Outils de l''achat / sourcing électronique','Sourcing'),(2,4,'Élaboration de cahiers des charges','Achats'),
 (3,5,'Gestion des marchés publics','Achats'),(3,5,'Axes stratégiques du Management Achats','Stratégie'),
 (3,5,'Sélection des fournisseurs','Fournisseurs'),(3,5,'Négociation des offres retenues','Négociation'),
 (3,5,'Évaluation de la performance des fournisseurs','Performance'),(3,6,'Achats durables et éco-responsables','Achats durables');
