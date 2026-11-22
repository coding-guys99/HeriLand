-- HeriLand Cloud: initial PostgreSQL schema (NEW dedicated Supabase project only).
-- REVIEW before applying. Never execute on expoLink / sharkAttend / BringCheck.
create extension if not exists pgcrypto;
create table public.heriland_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique,
 display_name text not null,
 bio text not null default '',
 city text,
 avatar_path text,
 created_at timestamptz not null default now()
);
create table public.heriland_posts (
 id bigint generated always as identity primary key,
 user_id uuid references auth.users(id) on delete cascade,
 demo_author text,
 title text not null check(char_length(title) between 1 and 140),
 body text not null default '' check(char_length(body)<=5000),
 city text not null,
 category text not null,
 status text not null default 'published' check(status in ('published','hidden')),
 is_demo boolean not null default false,
 created_at timestamptz not null default now(),
 constraint owner_or_seed check ((user_id is not null and is_demo=false) or (user_id is null and is_demo=true))
);
create index heriland_posts_feed on public.heriland_posts(status,created_at desc,id desc);
create index heriland_posts_city on public.heriland_posts(city,status,created_at desc);
create table public.heriland_post_media (
 id bigint generated always as identity primary key,
 post_id bigint not null references public.heriland_posts(id) on delete cascade,
 path text not null,
 kind text not null default 'image' check(kind in ('image','video')),
 sort_order integer not null default 0
);
create table public.heriland_comments (
 id bigint generated always as identity primary key,
 post_id bigint not null references public.heriland_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 1000),
 created_at timestamptz not null default now()
);
create table public.heriland_likes (
 post_id bigint not null references public.heriland_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(post_id,user_id)
);
create table public.heriland_saves (
 post_id bigint not null references public.heriland_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(post_id,user_id)
);
create table public.heriland_follows (
 follower_id uuid not null references auth.users(id) on delete cascade,
 followed_id uuid not null references auth.users(id) on delete cascade,
 primary key(follower_id,followed_id),check(follower_id<>followed_id)
);
create table public.heriland_guides (
 id bigint generated always as identity primary key,
 legacy_key text unique,
 title text not null, type text not null,
 kind text not null,city text not null,
 summary text not null default '',body text not null default '',
 image_path text,tags text[] not null default '{}',
 source text not null default '',
 is_demo boolean not null default true,
 status text not null default 'published'
);
create table public.heriland_guide_saves (
 guide_id bigint not null references public.heriland_guides(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(guide_id,user_id)
);
create table public.heriland_drafts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 title text not null default '',
 body text not null default '',
 city text,category text,
 media_paths text[] not null default '{}',
 updated_at timestamptz not null default now()
);
create table public.heriland_reports (
 id bigint generated always as identity primary key,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 post_id bigint references public.heriland_posts(id) on delete cascade,
 comment_id bigint references public.heriland_comments(id) on delete cascade,
 reason text not null check(char_length(reason) between 3 and 1000),
 status text not null default 'open',
 created_at timestamptz not null default now()
);

alter table public.heriland_profiles enable row level security;
alter table public.heriland_posts enable row level security;
alter table public.heriland_post_media enable row level security;
alter table public.heriland_comments enable row level security;
alter table public.heriland_likes enable row level security;
alter table public.heriland_saves enable row level security;
alter table public.heriland_follows enable row level security;
alter table public.heriland_guides enable row level security;
alter table public.heriland_guide_saves enable row level security;
alter table public.heriland_drafts enable row level security;
alter table public.heriland_reports enable row level security;

create policy "read profiles" on public.heriland_profiles for select to anon,authenticated using(true);
create policy "create own profile" on public.heriland_profiles for insert to authenticated with check((select auth.uid())=user_id);
create policy "edit own profile" on public.heriland_profiles for update to authenticated
 using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "read published posts" on public.heriland_posts for select to anon,authenticated using(status='published');
create policy "create own post" on public.heriland_posts for insert to authenticated
 with check((select auth.uid())=user_id and is_demo=false and status='published');
create policy "edit own post" on public.heriland_posts for update to authenticated
 using((select auth.uid())=user_id) with check((select auth.uid())=user_id and is_demo=false);
create policy "delete own post" on public.heriland_posts for delete to authenticated using((select auth.uid())=user_id);
create policy "read post media" on public.heriland_post_media for select to anon,authenticated
 using(exists(select 1 from public.heriland_posts p where p.id=post_id and p.status='published'));
create policy "attach own media" on public.heriland_post_media for insert to authenticated
 with check(exists(select 1 from public.heriland_posts p where p.id=post_id and p.user_id=(select auth.uid())));
create policy "remove own media" on public.heriland_post_media for delete to authenticated
 using(exists(select 1 from public.heriland_posts p where p.id=post_id and p.user_id=(select auth.uid())));
create policy "read comments" on public.heriland_comments for select to anon,authenticated
 using(exists(select 1 from public.heriland_posts p where p.id=post_id and p.status='published'));
create policy "create own comment" on public.heriland_comments for insert to authenticated
 with check((select auth.uid())=user_id and exists(select 1 from public.heriland_posts p where p.id=post_id and p.status='published'));
create policy "delete own comment" on public.heriland_comments for delete to authenticated using((select auth.uid())=user_id);
create policy "read likes" on public.heriland_likes for select to anon,authenticated using(true);
create policy "like" on public.heriland_likes for insert to authenticated
 with check((select auth.uid())=user_id and exists(select 1 from public.heriland_posts p where p.id=post_id and p.status='published'));
create policy "unlike" on public.heriland_likes for delete to authenticated using((select auth.uid())=user_id);
create policy "read own saves" on public.heriland_saves for select to authenticated using((select auth.uid())=user_id);
create policy "save post" on public.heriland_saves for insert to authenticated with check((select auth.uid())=user_id);
create policy "unsave post" on public.heriland_saves for delete to authenticated using((select auth.uid())=user_id);
create policy "read follows" on public.heriland_follows for select to anon,authenticated using(true);
create policy "follow" on public.heriland_follows for insert to authenticated with check((select auth.uid())=follower_id);
create policy "unfollow" on public.heriland_follows for delete to authenticated using((select auth.uid())=follower_id);
create policy "read guides" on public.heriland_guides for select to anon,authenticated using(status='published');
create policy "read own guide saves" on public.heriland_guide_saves for select to authenticated using((select auth.uid())=user_id);
create policy "save guide" on public.heriland_guide_saves for insert to authenticated with check((select auth.uid())=user_id);
create policy "unsave guide" on public.heriland_guide_saves for delete to authenticated using((select auth.uid())=user_id);
create policy "read own draft" on public.heriland_drafts for select to authenticated using((select auth.uid())=user_id);
create policy "create own draft" on public.heriland_drafts for insert to authenticated with check((select auth.uid())=user_id);
create policy "edit own draft" on public.heriland_drafts for update to authenticated
 using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "remove own draft" on public.heriland_drafts for delete to authenticated using((select auth.uid())=user_id);
create policy "report content" on public.heriland_reports for insert to authenticated
 with check((select auth.uid())=reporter_id and status='open');
create policy "read own reports" on public.heriland_reports for select to authenticated using((select auth.uid())=reporter_id);

-- User upload: bucket must be created on the dedicated project.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('heriland-media','heriland-media',true,12582912,array['image/jpeg','image/png','image/webp','video/mp4'])
 on conflict(id) do nothing;
create policy "upload own HeriLand folder" on storage.objects for insert to authenticated
 with check(bucket_id='heriland-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "delete own HeriLand media" on storage.objects for delete to authenticated
 using(bucket_id='heriland-media' and owner_id=(select auth.uid())::text);
-- No public upserts; admin moderation and notifications require trusted backend.
