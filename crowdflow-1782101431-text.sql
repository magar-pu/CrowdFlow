--
-- PostgreSQL database dump
--

\restrict 0E40yy9FIc2Whut8QbTN4sZE5AOd7wHdbkwafaOjgpvLha2fHMSWWMt7RufhX4p

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-07-10 12:14:12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 908 (class 1247 OID 16656)
-- Name: event_seat_state; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_seat_state AS ENUM (
    'available',
    'blocked',
    'sold'
);


ALTER TYPE public.event_seat_state OWNER TO postgres;

--
-- TOC entry 923 (class 1247 OID 16700)
-- Name: event_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_status AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'rejected'
);


ALTER TYPE public.event_status OWNER TO postgres;

--
-- TOC entry 893 (class 1247 OID 16606)
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'paid',
    'expired',
    'failed',
    'refunded'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- TOC entry 896 (class 1247 OID 16618)
-- Name: order_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_type AS ENUM (
    'primary',
    'resale'
);


ALTER TYPE public.order_type OWNER TO postgres;

--
-- TOC entry 899 (class 1247 OID 16624)
-- Name: payment_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_method AS ENUM (
    'bank_transfer',
    'qris',
    'gopay',
    'shopeepay',
    'credit_card',
    'debit_card'
);


ALTER TYPE public.payment_method OWNER TO postgres;

--
-- TOC entry 914 (class 1247 OID 16674)
-- Name: refund_reason; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.refund_reason AS ENUM (
    'user_cancellation',
    'event_cancelled',
    'duplicate_payment'
);


ALTER TYPE public.refund_reason OWNER TO postgres;

--
-- TOC entry 911 (class 1247 OID 16664)
-- Name: refund_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.refund_status AS ENUM (
    'pending_review',
    'approved',
    'rejected',
    'processed'
);


ALTER TYPE public.refund_status OWNER TO postgres;

--
-- TOC entry 917 (class 1247 OID 16682)
-- Name: resale_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.resale_status AS ENUM (
    'active',
    'sold',
    'expired',
    'cancelled'
);


ALTER TYPE public.resale_status OWNER TO postgres;

--
-- TOC entry 905 (class 1247 OID 16648)
-- Name: seat_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.seat_status AS ENUM (
    'available',
    'blocked',
    'broken'
);


ALTER TYPE public.seat_status OWNER TO postgres;

--
-- TOC entry 890 (class 1247 OID 16595)
-- Name: ticket_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ticket_status AS ENUM (
    'reserved',
    'issued',
    'resold',
    'cancelled',
    'used'
);


ALTER TYPE public.ticket_status OWNER TO postgres;

--
-- TOC entry 902 (class 1247 OID 16638)
-- Name: tier_visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tier_visibility AS ENUM (
    'public',
    'hidden',
    'password_protected',
    'invite_only'
);


ALTER TYPE public.tier_visibility OWNER TO postgres;

--
-- TOC entry 920 (class 1247 OID 16692)
-- Name: verification_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.verification_status AS ENUM (
    'pending_verification',
    'verified',
    'rejected'
);


ALTER TYPE public.verification_status OWNER TO postgres;

--
-- TOC entry 257 (class 1255 OID 17296)
-- Name: check_ticket_limit_per_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_ticket_limit_per_user() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_count INTEGER;
    tier_limit    INTEGER;
BEGIN
    SELECT max_ticket_per_user INTO tier_limit
    FROM ticket_tiers WHERE id = NEW.ticket_tier_id;

    SELECT COUNT(*) INTO current_count
    FROM tickets t
    JOIN orders o ON t.order_id = o.id
    JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
    WHERE o.purchaser_id = (SELECT purchaser_id FROM orders WHERE id = NEW.order_id)
      AND t.ticket_tier_id = NEW.ticket_tier_id
      AND tt.event_id = (SELECT event_id FROM ticket_tiers WHERE id = NEW.ticket_tier_id)
      AND t.ticket_status NOT IN ('cancelled', 'refunded');

    IF current_count >= tier_limit THEN
        RAISE EXCEPTION 'Purchase limit of % tickets per user exceeded for this tier', tier_limit;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_ticket_limit_per_user() OWNER TO postgres;

--
-- TOC entry 256 (class 1255 OID 16709)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 240 (class 1259 OID 16938)
-- Name: event_approval_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_approval_log (
    id integer NOT NULL,
    event_id integer NOT NULL,
    auditor_id integer NOT NULL,
    decision public.event_status NOT NULL,
    notes text,
    decided_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT event_approval_log_decision_check CHECK ((decision = ANY (ARRAY['approved'::public.event_status, 'rejected'::public.event_status])))
);


ALTER TABLE public.event_approval_log OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16937)
-- Name: event_approval_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_approval_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_approval_log_id_seq OWNER TO postgres;

--
-- TOC entry 5404 (class 0 OID 0)
-- Dependencies: 239
-- Name: event_approval_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_approval_log_id_seq OWNED BY public.event_approval_log.id;


--
-- TOC entry 246 (class 1259 OID 17026)
-- Name: event_seats_matrix; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_seats_matrix (
    id integer NOT NULL,
    event_id integer NOT NULL,
    seat_id integer NOT NULL,
    event_section_id integer NOT NULL,
    ticket_tier_id integer NOT NULL,
    current_state public.event_seat_state DEFAULT 'available'::public.event_seat_state NOT NULL
);


ALTER TABLE public.event_seats_matrix OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 17025)
-- Name: event_seats_matrix_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_seats_matrix_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_seats_matrix_id_seq OWNER TO postgres;

--
-- TOC entry 5405 (class 0 OID 0)
-- Dependencies: 245
-- Name: event_seats_matrix_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_seats_matrix_id_seq OWNED BY public.event_seats_matrix.id;


--
-- TOC entry 244 (class 1259 OID 16996)
-- Name: event_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_sections (
    id integer NOT NULL,
    event_id integer NOT NULL,
    section_id integer NOT NULL,
    ticket_tier_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.event_sections OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16995)
-- Name: event_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_sections_id_seq OWNER TO postgres;

--
-- TOC entry 5406 (class 0 OID 0)
-- Dependencies: 243
-- Name: event_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_sections_id_seq OWNED BY public.event_sections.id;


--
-- TOC entry 255 (class 1259 OID 17428)
-- Name: event_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_types (
    id integer NOT NULL,
    event_type character varying(100) NOT NULL
);


ALTER TABLE public.event_types OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 17427)
-- Name: event_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_types_id_seq OWNER TO postgres;

--
-- TOC entry 5407 (class 0 OID 0)
-- Dependencies: 254
-- Name: event_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_types_id_seq OWNED BY public.event_types.id;


--
-- TOC entry 238 (class 1259 OID 16897)
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id integer NOT NULL,
    venue_id integer NOT NULL,
    organizer_id integer NOT NULL,
    event_name character varying(100) NOT NULL,
    description text,
    event_start timestamp with time zone NOT NULL,
    event_end timestamp with time zone NOT NULL,
    entertainment_tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
    entertainment_tax_passed_to_buyer boolean DEFAULT false NOT NULL,
    status public.event_status DEFAULT 'draft'::public.event_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    event_type_id integer NOT NULL,
    cover_image_url character varying(255)
);


ALTER TABLE public.events OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16896)
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO postgres;

--
-- TOC entry 5408 (class 0 OID 0)
-- Dependencies: 237
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- TOC entry 248 (class 1259 OID 17095)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchaser_id integer NOT NULL,
    event_id integer NOT NULL,
    order_type public.order_type NOT NULL,
    ticket_face_value_total numeric(12,2) CONSTRAINT orders_ticket_amount_not_null NOT NULL,
    platform_fee_rate numeric(5,2) NOT NULL,
    platform_fee numeric(12,2) NOT NULL,
    platform_fee_ppn numeric(12,2) NOT NULL,
    gateway_fee numeric(12,2) NOT NULL,
    gateway_fee_ppn numeric(12,2) NOT NULL,
    ppn_rate numeric(5,2) DEFAULT 11.00 NOT NULL,
    entertainment_tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
    entertainment_tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
    entertainment_tax_passed_to_buyer boolean DEFAULT false NOT NULL,
    gross_amount numeric(12,2) NOT NULL,
    net_amount numeric(12,2) NOT NULL,
    payment_provider character varying(50) NOT NULL,
    payment_type public.payment_method NOT NULL,
    external_transaction_id character varying(255),
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    CONSTRAINT chk_net_amount CHECK ((net_amount = ((((gross_amount - platform_fee) - platform_fee_ppn) - gateway_fee) - gateway_fee_ppn)))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16763)
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    permission_name character varying(100) NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16762)
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- TOC entry 5409 (class 0 OID 0)
-- Dependencies: 224
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- TOC entry 247 (class 1259 OID 17061)
-- Name: queue_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.queue_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id integer NOT NULL,
    ticket_tier_id integer NOT NULL,
    user_id integer NOT NULL,
    queue_token character varying(255) NOT NULL,
    "position" integer NOT NULL,
    entered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    admitted_at timestamp with time zone
);


ALTER TABLE public.queue_entries OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 17222)
-- Name: refunds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    ticket_id uuid,
    requested_by integer NOT NULL,
    reason public.refund_reason NOT NULL,
    requested_refund_amount numeric(12,2) NOT NULL,
    penalty_fee_deducted numeric(12,2) DEFAULT 0.00 NOT NULL,
    final_disbursed_amount numeric(12,2) NOT NULL,
    status public.refund_status DEFAULT 'pending_review'::public.refund_status NOT NULL,
    auditor_notes text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refunds OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16773)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16711)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    role_name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16710)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5410 (class 0 OID 0)
-- Dependencies: 219
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 253 (class 1259 OID 17302)
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    batch integer NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 17301)
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schema_migrations_id_seq OWNER TO postgres;

--
-- TOC entry 5411 (class 0 OID 0)
-- Dependencies: 252
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- TOC entry 236 (class 1259 OID 16877)
-- Name: seats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seats (
    id integer NOT NULL,
    section_id integer NOT NULL,
    row_number character varying(10) NOT NULL,
    seat_number character varying(10) NOT NULL,
    seat_status public.seat_status DEFAULT 'available'::public.seat_status NOT NULL
);


ALTER TABLE public.seats OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16876)
-- Name: seats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seats_id_seq OWNER TO postgres;

--
-- TOC entry 5412 (class 0 OID 0)
-- Dependencies: 235
-- Name: seats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.seats_id_seq OWNED BY public.seats.id;


--
-- TOC entry 250 (class 1259 OID 17183)
-- Name: ticket_resale_listings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_resale_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    seller_id integer NOT NULL,
    buyer_id integer,
    original_ticket_price numeric(12,2) NOT NULL,
    listing_price numeric(12,2) NOT NULL,
    resale_order_id uuid,
    status public.resale_status DEFAULT 'active'::public.resale_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ticket_resale_listings OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16964)
-- Name: ticket_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_tiers (
    id integer NOT NULL,
    event_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    visibility public.tier_visibility DEFAULT 'public'::public.tier_visibility NOT NULL,
    access_code character varying(100),
    price numeric(12,2) NOT NULL,
    max_ticket_per_user integer DEFAULT 4 NOT NULL,
    allocation_limit integer NOT NULL,
    tickets_sold integer DEFAULT 0 NOT NULL,
    sales_start timestamp with time zone NOT NULL,
    sales_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ticket_tiers OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16963)
-- Name: ticket_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_tiers_id_seq OWNER TO postgres;

--
-- TOC entry 5413 (class 0 OID 0)
-- Dependencies: 241
-- Name: ticket_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_tiers_id_seq OWNED BY public.ticket_tiers.id;


--
-- TOC entry 249 (class 1259 OID 17144)
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    event_seats_matrix_id integer,
    ticket_tier_id integer NOT NULL,
    attendee_full_name character varying(100) NOT NULL,
    attendee_email character varying(255) NOT NULL,
    attendee_phone character varying(20),
    attendee_nik character varying(16),
    attendee_passport character varying(100),
    is_resold boolean DEFAULT false NOT NULL,
    ticket_status public.ticket_status DEFAULT 'reserved'::public.ticket_status NOT NULL,
    qr_signature text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    unit_price numeric(12,2) NOT NULL
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16813)
-- Name: user_bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_bank_accounts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    bank_name character varying(100) NOT NULL,
    account_number character varying(50) NOT NULL,
    account_holder_name character varying(255) NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_bank_accounts OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16812)
-- Name: user_bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_bank_accounts_id_seq OWNER TO postgres;

--
-- TOC entry 5414 (class 0 OID 0)
-- Dependencies: 229
-- Name: user_bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_bank_accounts_id_seq OWNED BY public.user_bank_accounts.id;


--
-- TOC entry 223 (class 1259 OID 16742)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    user_id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    avatar_pic character varying(255),
    phone_number character varying(50),
    nik character varying(16),
    passport_number character varying(50),
    identity_verified_at timestamp with time zone,
    location character varying(255),
    bio text
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16791)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    event_id integer,
    role_id integer NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16790)
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO postgres;

--
-- TOC entry 5415 (class 0 OID 0)
-- Dependencies: 227
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- TOC entry 222 (class 1259 OID 16722)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    verification_status public.verification_status DEFAULT 'pending_verification'::public.verification_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    auth_provider character varying(50) DEFAULT 'native'::character varying NOT NULL,
    CONSTRAINT chk_auth_provider_password CHECK (((((auth_provider)::text = 'native'::text) AND (password_hash IS NOT NULL)) OR (((auth_provider)::text <> 'native'::text) AND (password_hash IS NULL))))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16721)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5416 (class 0 OID 0)
-- Dependencies: 221
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 234 (class 1259 OID 16859)
-- Name: venue_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venue_sections (
    id integer NOT NULL,
    venue_id integer NOT NULL,
    section_name character varying(50) NOT NULL,
    capacity integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.venue_sections OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16858)
-- Name: venue_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.venue_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.venue_sections_id_seq OWNER TO postgres;

--
-- TOC entry 5417 (class 0 OID 0)
-- Dependencies: 233
-- Name: venue_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.venue_sections_id_seq OWNED BY public.venue_sections.id;


--
-- TOC entry 232 (class 1259 OID 16839)
-- Name: venues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venues (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    address text NOT NULL,
    city character varying(100) NOT NULL,
    province character varying(100) NOT NULL,
    total_capacity integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.venues OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16838)
-- Name: venues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.venues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.venues_id_seq OWNER TO postgres;

--
-- TOC entry 5418 (class 0 OID 0)
-- Dependencies: 231
-- Name: venues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.venues_id_seq OWNED BY public.venues.id;


--
-- TOC entry 5017 (class 2604 OID 16941)
-- Name: event_approval_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_approval_log ALTER COLUMN id SET DEFAULT nextval('public.event_approval_log_id_seq'::regclass);


--
-- TOC entry 5027 (class 2604 OID 17029)
-- Name: event_seats_matrix id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_seats_matrix ALTER COLUMN id SET DEFAULT nextval('public.event_seats_matrix_id_seq'::regclass);


--
-- TOC entry 5025 (class 2604 OID 16999)
-- Name: event_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_sections ALTER COLUMN id SET DEFAULT nextval('public.event_sections_id_seq'::regclass);


--
-- TOC entry 5056 (class 2604 OID 17431)
-- Name: event_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_types ALTER COLUMN id SET DEFAULT nextval('public.event_types_id_seq'::regclass);


--
-- TOC entry 5011 (class 2604 OID 16900)
-- Name: events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- TOC entry 4998 (class 2604 OID 16766)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 4992 (class 2604 OID 16714)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 5054 (class 2604 OID 17305)
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- TOC entry 5009 (class 2604 OID 16880)
-- Name: seats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats ALTER COLUMN id SET DEFAULT nextval('public.seats_id_seq'::regclass);


--
-- TOC entry 5019 (class 2604 OID 16967)
-- Name: ticket_tiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_tiers ALTER COLUMN id SET DEFAULT nextval('public.ticket_tiers_id_seq'::regclass);


--
-- TOC entry 5000 (class 2604 OID 16816)
-- Name: user_bank_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.user_bank_accounts_id_seq'::regclass);


--
-- TOC entry 4999 (class 2604 OID 16794)
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- TOC entry 4993 (class 2604 OID 16725)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5007 (class 2604 OID 16862)
-- Name: venue_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venue_sections ALTER COLUMN id SET DEFAULT nextval('public.venue_sections_id_seq'::regclass);


--
-- TOC entry 5004 (class 2604 OID 16842)
-- Name: venues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venues ALTER COLUMN id SET DEFAULT nextval('public.venues_id_seq'::regclass);


--
-- TOC entry 5383 (class 0 OID 16938)
-- Dependencies: 240
-- Data for Name: event_approval_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_approval_log (id, event_id, auditor_id, decision, notes, decided_at) FROM stdin;
\.


--
-- TOC entry 5389 (class 0 OID 17026)
-- Dependencies: 246
-- Data for Name: event_seats_matrix; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_seats_matrix (id, event_id, seat_id, event_section_id, ticket_tier_id, current_state) FROM stdin;
\.


--
-- TOC entry 5387 (class 0 OID 16996)
-- Dependencies: 244
-- Data for Name: event_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_sections (id, event_id, section_id, ticket_tier_id, is_active) FROM stdin;
\.


--
-- TOC entry 5398 (class 0 OID 17428)
-- Dependencies: 255
-- Data for Name: event_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_types (id, event_type) FROM stdin;
1	Concert
2	Festival
3	Sport
4	Conference
5	Exhibition
6	Community
7	Workshop & Seminar
8	Other
\.


--
-- TOC entry 5381 (class 0 OID 16897)
-- Dependencies: 238
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, venue_id, organizer_id, event_name, description, event_start, event_end, entertainment_tax_rate, entertainment_tax_passed_to_buyer, status, created_at, updated_at, event_type_id, cover_image_url) FROM stdin;
2	1	15	In-Memory Event via Bash Curl	An event uploaded using memory-only tokens.	2026-10-16 02:00:00+07	2026-10-16 05:30:00+07	15.00	t	approved	2026-07-05 22:59:26.052146+07	2026-07-05 22:59:26.052146+07	1	http://minio:9000/crowdflow-uploads/events/covers/1783267166384660342.png
3	1	15	In-Memory Event via Bash Curl - Drafted	An event uploaded using memory-only tokens.	2026-10-16 02:00:00+07	2026-10-16 05:30:00+07	15.00	t	draft	2026-07-05 23:21:05.286452+07	2026-07-05 23:21:05.286452+07	1	http://minio:9000/crowdflow-uploads/events/covers/1783268465170433522.png
4	1	15	Taylor Swift: The Eras Tour Jakarta	Experience the monumental tour live in Jakarta with a state-of-the-art stage setup.	2026-10-16 02:00:00+07	2026-10-16 05:30:00+07	15.00	t	approved	2026-07-05 23:24:41.345152+07	2026-07-05 23:24:41.345152+07	1	https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop
5	2	15	Java Jazz Festival 2026	Three days of incredible jazz music featuring global legends and local masterminds.	2026-11-20 23:00:00+07	2026-11-23 06:59:59+07	10.00	f	approved	2026-07-05 23:24:41.405014+07	2026-07-05 23:24:41.405014+07	2	https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop
6	3	15	Prambanan Jazz Festival 2026	Witness music under the stars with the majestic Prambanan temple as the backdrop.	2026-09-06 00:00:00+07	2026-09-06 06:00:00+07	10.00	t	rejected	2026-07-05 23:24:41.459718+07	2026-07-06 00:56:49.864744+07	1	http://localhost:9000/crowdflow-uploads/events/covers/image.png
\.


--
-- TOC entry 5391 (class 0 OID 17095)
-- Dependencies: 248
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, purchaser_id, event_id, order_type, ticket_face_value_total, platform_fee_rate, platform_fee, platform_fee_ppn, gateway_fee, gateway_fee_ppn, ppn_rate, entertainment_tax_rate, entertainment_tax_amount, entertainment_tax_passed_to_buyer, gross_amount, net_amount, payment_provider, payment_type, external_transaction_id, status, expires_at, paid_at, created_at, updated_at, quantity) FROM stdin;
\.


--
-- TOC entry 5368 (class 0 OID 16763)
-- Dependencies: 225
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, permission_name) FROM stdin;
1	users:view
2	users:manage
3	roles:view
4	roles:manage
5	venues:view
6	venues:manage
7	events:view
8	events:create
9	events:update
10	events:publish
11	events:audit
12	tickets:view
13	tickets:scan
14	orders:view
15	refunds:view
16	refunds:manage
17	reports:view
\.


--
-- TOC entry 5390 (class 0 OID 17061)
-- Dependencies: 247
-- Data for Name: queue_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.queue_entries (id, event_id, ticket_tier_id, user_id, queue_token, "position", entered_at, expires_at, admitted_at) FROM stdin;
\.


--
-- TOC entry 5394 (class 0 OID 17222)
-- Dependencies: 251
-- Data for Name: refunds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refunds (id, order_id, ticket_id, requested_by, reason, requested_refund_amount, penalty_fee_deducted, final_disbursed_amount, status, auditor_notes, processed_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5369 (class 0 OID 16773)
-- Dependencies: 226
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
1	1
1	2
1	3
1	4
1	5
1	6
1	7
1	8
1	9
1	10
1	11
1	12
1	13
1	14
1	15
1	16
1	17
2	5
2	7
2	11
2	12
2	14
2	15
2	16
2	17
4	7
4	13
\.


--
-- TOC entry 5363 (class 0 OID 16711)
-- Dependencies: 220
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, role_name) FROM stdin;
1	Super Admin
2	Auditor
3	Event Organizer
4	Gate Scanner
5	User
\.


--
-- TOC entry 5396 (class 0 OID 17302)
-- Dependencies: 253
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (id, migration_name, batch, applied_at) FROM stdin;
1	0001_initial_schema.up.sql	1	2026-06-24 10:10:44.917912
2	0002_testing_migration_table.up.sql	2	2026-06-24 11:07:22.748318
\.


--
-- TOC entry 5379 (class 0 OID 16877)
-- Dependencies: 236
-- Data for Name: seats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seats (id, section_id, row_number, seat_number, seat_status) FROM stdin;
\.


--
-- TOC entry 5393 (class 0 OID 17183)
-- Dependencies: 250
-- Data for Name: ticket_resale_listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_resale_listings (id, ticket_id, seller_id, buyer_id, original_ticket_price, listing_price, resale_order_id, status, created_at, expires_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5385 (class 0 OID 16964)
-- Dependencies: 242
-- Data for Name: ticket_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_tiers (id, event_id, name, description, visibility, access_code, price, max_ticket_per_user, allocation_limit, tickets_sold, sales_start, sales_end, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5392 (class 0 OID 17144)
-- Dependencies: 249
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tickets (id, order_id, event_seats_matrix_id, ticket_tier_id, attendee_full_name, attendee_email, attendee_phone, attendee_nik, attendee_passport, is_resold, ticket_status, qr_signature, created_at, updated_at, unit_price) FROM stdin;
\.


--
-- TOC entry 5373 (class 0 OID 16813)
-- Dependencies: 230
-- Data for Name: user_bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_bank_accounts (id, user_id, bank_name, account_number, account_holder_name, is_verified, verified_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5366 (class 0 OID 16742)
-- Dependencies: 223
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profiles (user_id, full_name, avatar_pic, phone_number, nik, passport_number, identity_verified_at, location, bio) FROM stdin;
14	organizer1	\N	\N	\N	\N	\N	\N	\N
15	Admin Super	\N	\N	\N	\N	\N	\N	\N
16	user 1	\N	67890453534	\N	\N	\N	Jakarta	Hello World
\.


--
-- TOC entry 5371 (class 0 OID 16791)
-- Dependencies: 228
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, event_id, role_id) FROM stdin;
8	16	\N	5
7	15	\N	1
6	14	\N	3
\.


--
-- TOC entry 5365 (class 0 OID 16722)
-- Dependencies: 222
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, verification_status, created_at, updated_at, auth_provider) FROM stdin;
15	super-admin@crowdflow.my.id	$2a$12$cE6SbWY.nwfCh9ZanWvOfOEriE8bC8JeqPbh6bGWXEiWneBH8knIK	verified	2026-07-05 21:45:35.571487+07	2026-07-05 21:51:10.503586+07	native
14	organizer1@crowdflow.my.id	$2a$12$VdFcEnsCQROZ.UkmtFUZS.zvRkWiW3MCOdeUcO111RA6fOzgU/hfe	verified	2026-07-05 21:44:43.719071+07	2026-07-05 21:53:25.403133+07	native
16	user1@gmail.com	$2a$12$sI6r3Ec30GgvCviyV5HG2emObu02lYkHeCoGvKd7ndmBObG5hvpEu	verified	2026-07-05 21:47:00.969565+07	2026-07-08 09:40:51.186878+07	native
\.


--
-- TOC entry 5377 (class 0 OID 16859)
-- Dependencies: 234
-- Data for Name: venue_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venue_sections (id, venue_id, section_name, capacity, created_at) FROM stdin;
\.


--
-- TOC entry 5375 (class 0 OID 16839)
-- Dependencies: 232
-- Data for Name: venues; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venues (id, name, address, city, province, total_capacity, created_at, updated_at) FROM stdin;
1	Stadion Utama Gelora Bung Karno	Jl. Pintu Satu Senayan	Jakarta	DKI Jakarta	78000	2026-07-05 22:01:55.851872+07	2026-07-05 22:01:55.851872+07
2	Indonesia Convention Exhibition (ICE) BSD	Jl. BSD Grand Boulevard No.1	Tangerang	Banten	10000	2026-07-05 22:01:55.851872+07	2026-07-05 22:01:55.851872+07
3	Candi Prambanan	Jl. Raya Solo - Yogyakarta No.16	Sleman	DI Yogyakarta	5000	2026-07-05 22:01:55.851872+07	2026-07-05 22:01:55.851872+07
\.


--
-- TOC entry 5419 (class 0 OID 0)
-- Dependencies: 239
-- Name: event_approval_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_approval_log_id_seq', 1, false);


--
-- TOC entry 5420 (class 0 OID 0)
-- Dependencies: 245
-- Name: event_seats_matrix_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_seats_matrix_id_seq', 1, false);


--
-- TOC entry 5421 (class 0 OID 0)
-- Dependencies: 243
-- Name: event_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_sections_id_seq', 1, false);


--
-- TOC entry 5422 (class 0 OID 0)
-- Dependencies: 254
-- Name: event_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_types_id_seq', 8, true);


--
-- TOC entry 5423 (class 0 OID 0)
-- Dependencies: 237
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_id_seq', 6, true);


--
-- TOC entry 5424 (class 0 OID 0)
-- Dependencies: 224
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 17, true);


--
-- TOC entry 5425 (class 0 OID 0)
-- Dependencies: 219
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- TOC entry 5426 (class 0 OID 0)
-- Dependencies: 252
-- Name: schema_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schema_migrations_id_seq', 2, true);


--
-- TOC entry 5427 (class 0 OID 0)
-- Dependencies: 235
-- Name: seats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.seats_id_seq', 1, false);


--
-- TOC entry 5428 (class 0 OID 0)
-- Dependencies: 241
-- Name: ticket_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ticket_tiers_id_seq', 1, false);


--
-- TOC entry 5429 (class 0 OID 0)
-- Dependencies: 229
-- Name: user_bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_bank_accounts_id_seq', 1, false);


--
-- TOC entry 5430 (class 0 OID 0)
-- Dependencies: 227
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 8, true);


--
-- TOC entry 5431 (class 0 OID 0)
-- Dependencies: 221
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 16, true);


--
-- TOC entry 5432 (class 0 OID 0)
-- Dependencies: 233
-- Name: venue_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.venue_sections_id_seq', 1, false);


--
-- TOC entry 5433 (class 0 OID 0)
-- Dependencies: 231
-- Name: venues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.venues_id_seq', 1, false);


--
-- TOC entry 5109 (class 2606 OID 16952)
-- Name: event_approval_log event_approval_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_approval_log
    ADD CONSTRAINT event_approval_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5122 (class 2606 OID 17038)
-- Name: event_seats_matrix event_seats_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_seats_matrix
    ADD CONSTRAINT event_seats_matrix_pkey PRIMARY KEY (id);


--
-- TOC entry 5117 (class 2606 OID 17007)
-- Name: event_sections event_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_sections
    ADD CONSTRAINT event_sections_pkey PRIMARY KEY (id);


--
-- TOC entry 5167 (class 2606 OID 17435)
-- Name: event_types event_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5104 (class 2606 OID 16920)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 5142 (class 2606 OID 17132)
-- Name: orders orders_external_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_external_transaction_id_key UNIQUE (external_transaction_id);


--
-- TOC entry 5144 (class 2606 OID 17130)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5078 (class 2606 OID 16772)
-- Name: permissions permissions_permission_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_name_key UNIQUE (permission_name);


--
-- TOC entry 5080 (class 2606 OID 16770)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5131 (class 2606 OID 17075)
-- Name: queue_entries queue_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5133 (class 2606 OID 17077)
-- Name: queue_entries queue_entries_queue_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_queue_token_key UNIQUE (queue_token);


--
-- TOC entry 5161 (class 2606 OID 17243)
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- TOC entry 5082 (class 2606 OID 16779)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- TOC entry 5061 (class 2606 OID 16718)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5063 (class 2606 OID 16720)
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- TOC entry 5163 (class 2606 OID 17313)
-- Name: schema_migrations schema_migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);


--
-- TOC entry 5165 (class 2606 OID 17311)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5100 (class 2606 OID 16888)
-- Name: seats seats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_pkey PRIMARY KEY (id);


--
-- TOC entry 5157 (class 2606 OID 17200)
-- Name: ticket_resale_listings ticket_resale_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_resale_listings
    ADD CONSTRAINT ticket_resale_listings_pkey PRIMARY KEY (id);


--
-- TOC entry 5115 (class 2606 OID 16988)
-- Name: ticket_tiers ticket_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_tiers
    ADD CONSTRAINT ticket_tiers_pkey PRIMARY KEY (id);


--
-- TOC entry 5150 (class 2606 OID 17164)
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 5152 (class 2606 OID 17166)
-- Name: tickets tickets_qr_signature_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_qr_signature_key UNIQUE (qr_signature);


--
-- TOC entry 5126 (class 2606 OID 17040)
-- Name: event_seats_matrix unique_event_seat; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_seats_matrix
    ADD CONSTRAINT unique_event_seat UNIQUE (event_id, seat_id);


--
-- TOC entry 5120 (class 2606 OID 17009)
-- Name: event_sections unique_event_section; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_sections
    ADD CONSTRAINT unique_event_section UNIQUE (event_id, section_id);


--
-- TOC entry 5102 (class 2606 OID 16890)
-- Name: seats unique_section_seat; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT unique_section_seat UNIQUE (section_id, row_number, seat_number);


--
-- TOC entry 5089 (class 2606 OID 16831)
-- Name: user_bank_accounts unique_user_bank; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_bank_accounts
    ADD CONSTRAINT unique_user_bank UNIQUE (user_id, bank_name, account_number);


--
-- TOC entry 5135 (class 2606 OID 17079)
-- Name: queue_entries unique_user_queue; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT unique_user_queue UNIQUE (event_id, ticket_tier_id, user_id);


--
-- TOC entry 5091 (class 2606 OID 16829)
-- Name: user_bank_accounts user_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_bank_accounts
    ADD CONSTRAINT user_bank_accounts_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 2606 OID 16754)
-- Name: user_profiles user_profiles_nik_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_nik_key UNIQUE (nik);


--
-- TOC entry 5072 (class 2606 OID 16756)
-- Name: user_profiles user_profiles_passport_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_passport_number_key UNIQUE (passport_number);


--
-- TOC entry 5074 (class 2606 OID 16752)
-- Name: user_profiles user_profiles_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_phone_number_key UNIQUE (phone_number);


--
-- TOC entry 5076 (class 2606 OID 16750)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- TOC entry 5086 (class 2606 OID 16799)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5066 (class 2606 OID 16740)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5068 (class 2606 OID 16738)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5096 (class 2606 OID 16870)
-- Name: venue_sections venue_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venue_sections
    ADD CONSTRAINT venue_sections_pkey PRIMARY KEY (id);


--
-- TOC entry 5093 (class 2606 OID 16856)
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- TOC entry 5110 (class 1259 OID 17266)
-- Name: idx_approval_log_auditor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_log_auditor ON public.event_approval_log USING btree (auditor_id);


--
-- TOC entry 5111 (class 1259 OID 17265)
-- Name: idx_approval_log_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_log_event ON public.event_approval_log USING btree (event_id);


--
-- TOC entry 5087 (class 1259 OID 17261)
-- Name: idx_bank_accounts_user_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_accounts_user_verified ON public.user_bank_accounts USING btree (user_id) WHERE (is_verified = true);


--
-- TOC entry 5123 (class 1259 OID 17273)
-- Name: idx_esm_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_esm_lookup ON public.event_seats_matrix USING btree (event_id, event_section_id, current_state);


--
-- TOC entry 5124 (class 1259 OID 17274)
-- Name: idx_esm_tier_pricing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_esm_tier_pricing ON public.event_seats_matrix USING btree (event_id, ticket_tier_id);


--
-- TOC entry 5118 (class 1259 OID 17272)
-- Name: idx_event_sections_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_sections_lookup ON public.event_sections USING btree (event_id, section_id);


--
-- TOC entry 5105 (class 1259 OID 17263)
-- Name: idx_events_organizer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_organizer ON public.events USING btree (organizer_id);


--
-- TOC entry 5106 (class 1259 OID 17262)
-- Name: idx_events_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_status ON public.events USING btree (status);


--
-- TOC entry 5107 (class 1259 OID 17264)
-- Name: idx_events_venue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_venue ON public.events USING btree (venue_id);


--
-- TOC entry 5136 (class 1259 OID 17276)
-- Name: idx_orders_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_event ON public.orders USING btree (event_id);


--
-- TOC entry 5137 (class 1259 OID 17279)
-- Name: idx_orders_external_tx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_external_tx ON public.orders USING btree (external_transaction_id) WHERE (external_transaction_id IS NOT NULL);


--
-- TOC entry 5138 (class 1259 OID 17275)
-- Name: idx_orders_purchaser; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_purchaser ON public.orders USING btree (purchaser_id);


--
-- TOC entry 5139 (class 1259 OID 17277)
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- TOC entry 5140 (class 1259 OID 17278)
-- Name: idx_orders_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_type ON public.orders USING btree (order_type);


--
-- TOC entry 5127 (class 1259 OID 17289)
-- Name: idx_queue_event_tier_position; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_queue_event_tier_position ON public.queue_entries USING btree (event_id, ticket_tier_id, "position");


--
-- TOC entry 5128 (class 1259 OID 17291)
-- Name: idx_queue_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_queue_token ON public.queue_entries USING btree (queue_token);


--
-- TOC entry 5129 (class 1259 OID 17290)
-- Name: idx_queue_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_queue_user ON public.queue_entries USING btree (user_id);


--
-- TOC entry 5158 (class 1259 OID 17287)
-- Name: idx_refunds_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refunds_order ON public.refunds USING btree (order_id);


--
-- TOC entry 5159 (class 1259 OID 17288)
-- Name: idx_refunds_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refunds_status ON public.refunds USING btree (status);


--
-- TOC entry 5153 (class 1259 OID 17285)
-- Name: idx_resale_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resale_active ON public.ticket_resale_listings USING btree (status) WHERE (status = 'active'::public.resale_status);


--
-- TOC entry 5154 (class 1259 OID 17286)
-- Name: idx_resale_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resale_seller ON public.ticket_resale_listings USING btree (seller_id);


--
-- TOC entry 5155 (class 1259 OID 17284)
-- Name: idx_resale_ticket_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resale_ticket_status ON public.ticket_resale_listings USING btree (ticket_id, status);


--
-- TOC entry 5097 (class 1259 OID 17270)
-- Name: idx_seats_section_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seats_section_lookup ON public.seats USING btree (section_id);


--
-- TOC entry 5098 (class 1259 OID 17269)
-- Name: idx_seats_section_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seats_section_status ON public.seats USING btree (section_id, seat_status);


--
-- TOC entry 5112 (class 1259 OID 17267)
-- Name: idx_ticket_tiers_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_tiers_event ON public.ticket_tiers USING btree (event_id);


--
-- TOC entry 5113 (class 1259 OID 17268)
-- Name: idx_ticket_tiers_sales_window; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_tiers_sales_window ON public.ticket_tiers USING btree (sales_start, sales_end) WHERE (visibility = 'public'::public.tier_visibility);


--
-- TOC entry 5145 (class 1259 OID 17282)
-- Name: idx_tickets_attendee_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_attendee_lookup ON public.tickets USING btree (attendee_email, attendee_nik);


--
-- TOC entry 5146 (class 1259 OID 17280)
-- Name: idx_tickets_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_order ON public.tickets USING btree (order_id);


--
-- TOC entry 5147 (class 1259 OID 17283)
-- Name: idx_tickets_resale_eligible; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_resale_eligible ON public.tickets USING btree (id) WHERE (is_resold = false);


--
-- TOC entry 5148 (class 1259 OID 17281)
-- Name: idx_tickets_tier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_tier ON public.tickets USING btree (ticket_tier_id);


--
-- TOC entry 5083 (class 1259 OID 16811)
-- Name: idx_user_roles_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_roles_event ON public.user_roles USING btree (user_id, event_id, role_id) WHERE (event_id IS NOT NULL);


--
-- TOC entry 5084 (class 1259 OID 16810)
-- Name: idx_user_roles_platform; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_roles_platform ON public.user_roles USING btree (user_id, role_id) WHERE (event_id IS NULL);


--
-- TOC entry 5064 (class 1259 OID 17260)
-- Name: idx_users_verification; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_verification ON public.users USING btree (verification_status);


--
-- TOC entry 5094 (class 1259 OID 17271)
-- Name: idx_venue_sections_venue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_venue_sections_venue ON public.venue_sections USING btree (venue_id);


--
-- TOC entry 5206 (class 2620 OID 16837)
-- Name: user_bank_accounts trg_bank_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON public.user_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5211 (class 2620 OID 17297)
-- Name: tickets trg_check_ticket_limit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_check_ticket_limit BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.check_ticket_limit_per_user();


--
-- TOC entry 5208 (class 2620 OID 16931)
-- Name: events trg_events_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5210 (class 2620 OID 17143)
-- Name: orders trg_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5214 (class 2620 OID 17259)
-- Name: refunds trg_refunds_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5213 (class 2620 OID 17221)
-- Name: ticket_resale_listings trg_resale_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_resale_updated_at BEFORE UPDATE ON public.ticket_resale_listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5209 (class 2620 OID 16994)
-- Name: ticket_tiers trg_ticket_tiers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ticket_tiers_updated_at BEFORE UPDATE ON public.ticket_tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5212 (class 2620 OID 17182)
-- Name: tickets trg_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5205 (class 2620 OID 16741)
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5207 (class 2620 OID 16857)
-- Name: venues trg_venues_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 5180 (class 2606 OID 16958)
-- Name: event_approval_log event_approval_log_auditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_approval_log
    ADD CONSTRAINT event_approval_log_auditor_id_fkey FOREIGN KEY (auditor_id) REFERENCES public.users(id);


--
-- TOC entry 5181 (class 2606 OID 16953)
-- Name: event_approval_log event_approval_log_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_approval_log
    ADD CONSTRAINT event_approval_log_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 5186 (class 2606 OID 17041)
-- Name: event_seats_matrix event_seats_matrix_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_seats_matrix
    ADD CONSTRAINT event_seats_matrix_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 5187 (class 2606 OID 17051)
-- Name: event_seats_matrix event_seats_matrix_event_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_seats_matrix
    ADD CONSTRAINT event_seats_matrix_event_section_id_fkey FOREIGN KEY (event_section_id) REFERENCES public.event_sections(id) ON DELETE CASCADE;


--
-- TOC entry 5188 (class 2606 OID 17046)
-- Name: event_seats_matrix event_seats_matrix_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_seats_matrix
    ADD CONSTRAINT event_seats_matrix_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE CASCADE;


--
-- TOC entry 5189 (class 2606 OID 17056)
-- Name: event_seats_matrix event_seats_matrix_ticket_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_seats_matrix
    ADD CONSTRAINT event_seats_matrix_ticket_tier_id_fkey FOREIGN KEY (ticket_tier_id) REFERENCES public.ticket_tiers(id) ON DELETE CASCADE;


--
-- TOC entry 5183 (class 2606 OID 17010)
-- Name: event_sections event_sections_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_sections
    ADD CONSTRAINT event_sections_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 5184 (class 2606 OID 17015)
-- Name: event_sections event_sections_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_sections
    ADD CONSTRAINT event_sections_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.venue_sections(id) ON DELETE CASCADE;


--
-- TOC entry 5185 (class 2606 OID 17020)
-- Name: event_sections event_sections_ticket_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_sections
    ADD CONSTRAINT event_sections_ticket_tier_id_fkey FOREIGN KEY (ticket_tier_id) REFERENCES public.ticket_tiers(id) ON DELETE CASCADE;


--
-- TOC entry 5177 (class 2606 OID 16926)
-- Name: events events_organizer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(id);


--
-- TOC entry 5178 (class 2606 OID 16921)
-- Name: events events_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id);


--
-- TOC entry 5179 (class 2606 OID 17437)
-- Name: events fk_events_event_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT fk_events_event_type FOREIGN KEY (event_type_id) REFERENCES public.event_types(id);


--
-- TOC entry 5193 (class 2606 OID 17138)
-- Name: orders orders_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- TOC entry 5194 (class 2606 OID 17133)
-- Name: orders orders_purchaser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_purchaser_id_fkey FOREIGN KEY (purchaser_id) REFERENCES public.users(id);


--
-- TOC entry 5190 (class 2606 OID 17080)
-- Name: queue_entries queue_entries_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 5191 (class 2606 OID 17085)
-- Name: queue_entries queue_entries_ticket_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_ticket_tier_id_fkey FOREIGN KEY (ticket_tier_id) REFERENCES public.ticket_tiers(id) ON DELETE CASCADE;


--
-- TOC entry 5192 (class 2606 OID 17090)
-- Name: queue_entries queue_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5202 (class 2606 OID 17244)
-- Name: refunds refunds_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5203 (class 2606 OID 17254)
-- Name: refunds refunds_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- TOC entry 5204 (class 2606 OID 17249)
-- Name: refunds refunds_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;


--
-- TOC entry 5169 (class 2606 OID 16785)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 5170 (class 2606 OID 16780)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5176 (class 2606 OID 16891)
-- Name: seats seats_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.venue_sections(id) ON DELETE CASCADE;


--
-- TOC entry 5198 (class 2606 OID 17211)
-- Name: ticket_resale_listings ticket_resale_listings_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_resale_listings
    ADD CONSTRAINT ticket_resale_listings_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- TOC entry 5199 (class 2606 OID 17216)
-- Name: ticket_resale_listings ticket_resale_listings_resale_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_resale_listings
    ADD CONSTRAINT ticket_resale_listings_resale_order_id_fkey FOREIGN KEY (resale_order_id) REFERENCES public.orders(id);


--
-- TOC entry 5200 (class 2606 OID 17206)
-- Name: ticket_resale_listings ticket_resale_listings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_resale_listings
    ADD CONSTRAINT ticket_resale_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- TOC entry 5201 (class 2606 OID 17201)
-- Name: ticket_resale_listings ticket_resale_listings_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_resale_listings
    ADD CONSTRAINT ticket_resale_listings_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5182 (class 2606 OID 16989)
-- Name: ticket_tiers ticket_tiers_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_tiers
    ADD CONSTRAINT ticket_tiers_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 5195 (class 2606 OID 17172)
-- Name: tickets tickets_event_seats_matrix_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_event_seats_matrix_id_fkey FOREIGN KEY (event_seats_matrix_id) REFERENCES public.event_seats_matrix(id);


--
-- TOC entry 5196 (class 2606 OID 17167)
-- Name: tickets tickets_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5197 (class 2606 OID 17177)
-- Name: tickets tickets_ticket_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_tier_id_fkey FOREIGN KEY (ticket_tier_id) REFERENCES public.ticket_tiers(id);


--
-- TOC entry 5174 (class 2606 OID 16832)
-- Name: user_bank_accounts user_bank_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_bank_accounts
    ADD CONSTRAINT user_bank_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5168 (class 2606 OID 16757)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5171 (class 2606 OID 16932)
-- Name: user_roles user_roles_event_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_event_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 5172 (class 2606 OID 16805)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5173 (class 2606 OID 16800)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5175 (class 2606 OID 16871)
-- Name: venue_sections venue_sections_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venue_sections
    ADD CONSTRAINT venue_sections_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;


-- Completed on 2026-07-10 12:14:14

--
-- PostgreSQL database dump complete
--

\unrestrict 0E40yy9FIc2Whut8QbTN4sZE5AOd7wHdbkwafaOjgpvLha2fHMSWWMt7RufhX4p

