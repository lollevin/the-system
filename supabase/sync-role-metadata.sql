-- ============================================
-- 同步用户角色到 app_metadata
-- ============================================
-- 这允许 middleware 直接从 JWT 读取角色，无需查询数据库

-- 1. 创建同步函数（需要 service_role 权限）
CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- 获取用户角色
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  
  IF v_role IS NOT NULL THEN
    -- 更新 app_metadata
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 触发器：当 profiles.role 更新时自动同步
CREATE OR REPLACE FUNCTION public.sync_role_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM public.sync_user_role_to_metadata(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_role_metadata ON public.profiles;
CREATE TRIGGER trigger_sync_role_metadata
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_on_update();

-- 3. 触发器：新用户创建时同步角色
CREATE OR REPLACE FUNCTION public.sync_role_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.sync_user_role_to_metadata(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_role_on_insert ON public.profiles;
CREATE TRIGGER trigger_sync_role_on_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_on_insert();

-- 4. 批量同步所有现有用户（运行一次）
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles
  LOOP
    PERFORM public.sync_user_role_to_metadata(r.id);
  END LOOP;
  RAISE NOTICE 'All user roles synced to app_metadata';
END;
$$;

-- ============================================
-- ✅ 角色同步已配置！
-- ============================================
-- 
-- 现在：
-- - 新用户创建时，角色自动同步到 app_metadata
-- - 角色更新时，自动同步到 app_metadata
-- - Middleware 可以直接从 JWT 读取角色，无需查询数据库
