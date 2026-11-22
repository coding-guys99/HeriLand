-- Applied separately in the HeriLand Supabase Free project.
drop policy if exists "attach own media" on public.heriland_post_media;
create policy "attach own media" on public.heriland_post_media for insert to authenticated
 with check (
 exists(select 1 from public.heriland_posts p
 where p.id=post_id and p.user_id=(select auth.uid()) and p.is_demo=false)
 and left(path,length((select auth.uid())::text)+1)=((select auth.uid())::text||'/')
 );
drop policy if exists "save post" on public.heriland_saves;
create policy "save published post" on public.heriland_saves for insert to authenticated
 with check ((select auth.uid())=user_id and exists(select 1 from public.heriland_posts p where p.id=post_id and p.status='published'));
drop policy if exists "save guide" on public.heriland_guide_saves;
create policy "save published guide" on public.heriland_guide_saves for insert to authenticated
 with check ((select auth.uid())=user_id and exists(select 1 from public.heriland_guides g where g.id=guide_id and g.status='published'));
create index if not exists heriland_comments_post_id_idx on public.heriland_comments(post_id,created_at);
create index if not exists heriland_comments_user_id_idx on public.heriland_comments(user_id);
create index if not exists heriland_follows_followed_idx on public.heriland_follows(followed_id);
create index if not exists heriland_guide_saves_user_idx on public.heriland_guide_saves(user_id);
create index if not exists heriland_likes_user_idx on public.heriland_likes(user_id);
create index if not exists heriland_post_media_post_idx on public.heriland_post_media(post_id,sort_order);
create index if not exists heriland_posts_user_idx on public.heriland_posts(user_id,created_at desc);
create index if not exists heriland_reports_comment_idx on public.heriland_reports(comment_id);
create index if not exists heriland_reports_post_idx on public.heriland_reports(post_id);
create index if not exists heriland_reports_reporter_idx on public.heriland_reports(reporter_id);
create index if not exists heriland_saves_user_idx on public.heriland_saves(user_id);
