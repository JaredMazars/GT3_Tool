-- Check user walter.taxadmin permissions and project access
-- Replace with actual email if different

-- 1. Find the user
SELECT 
    id as userId,
    email,
    name,
    role as systemRole
FROM [User]
WHERE email LIKE '%walter%taxadmin%' OR email LIKE '%walter.taxadmin%';

-- 2. Check service line access
SELECT 
    u.email,
    slu.serviceLine,
    slu.role as serviceLineRole,
    slu.id as serviceLineUserId
FROM [User] u
INNER JOIN ServiceLineUser slu ON u.id = slu.userId
WHERE u.email LIKE '%walter%taxadmin%' OR u.email LIKE '%walter.taxadmin%';

-- 3. Check project memberships
SELECT 
    u.email,
    p.id as projectId,
    p.name as projectName,
    p.serviceLine,
    pu.role as projectRole,
    pu.id as projectUserId
FROM [User] u
INNER JOIN ProjectUser pu ON u.id = pu.userId
INNER JOIN Project p ON pu.projectId = p.id
WHERE u.email LIKE '%walter%taxadmin%' OR u.email LIKE '%walter.taxadmin%';

-- 4. Show all TAX projects to see which ones this user should/shouldn't access
SELECT TOP 20
    p.id,
    p.name,
    p.serviceLine,
    p.createdBy,
    (SELECT COUNT(*) FROM ProjectUser WHERE projectId = p.id) as teamMemberCount
FROM Project p
WHERE p.serviceLine = 'TAX'
ORDER BY p.createdAt DESC;










