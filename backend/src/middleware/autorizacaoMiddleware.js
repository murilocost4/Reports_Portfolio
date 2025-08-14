const autorizacaoMiddleware = (rolesPermitidos) => (req, res, next) => {
    // Converter para array se não for
    if (!Array.isArray(rolesPermitidos)) {
        rolesPermitidos = [rolesPermitidos];
    }

    // AdminMaster sempre tem acesso
    if (req.usuario.isAdminMaster) {
        return next();
    }

    // Obter todas as roles do usuário (principal + adicionais)
    const todasRoles = req.usuario.todasRoles || [req.usuario.role];
    
    // Verificar se o usuário tem pelo menos uma das roles permitidas
    const temPermissao = rolesPermitidos.some(rolePermitida => 
        todasRoles.includes(rolePermitida)
    );

    if (temPermissao) {
        return next();
    }

    return res.status(403).json({ erro: 'Acesso negado' });
};

const verificarAcessoTenant = (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }

    try {
        // Handle tenant_id as array in usuario
        let userTenantId = req.usuario.tenant_id;
        if (Array.isArray(userTenantId)) {
            userTenantId = userTenantId[0];
        }
        
        // Get tenant ID from query or body
        let requestTenantId = req.query.tenantId || req.body.tenantId;
        
        // Handle case where tenant_id is passed as an object with properties
        // This happens when frontend sends an object instead of just the ID
        if (req.query['tenant_id[_id]']) {
            // Extract the _id from the object structure
            requestTenantId = req.query['tenant_id[_id]'];
        }
        
        // Handle tenant_id when it's passed as an object or array
        if (requestTenantId && typeof requestTenantId === 'object') {
            if (Array.isArray(requestTenantId)) {
                requestTenantId = requestTenantId[0];
                if (typeof requestTenantId === 'object' && requestTenantId._id) {
                    requestTenantId = requestTenantId._id;
                }
            } else if (requestTenantId._id) {
                requestTenantId = requestTenantId._id;
            }
        }
        
        // Handle tenant ID as array string in request (only if it's valid JSON)
        if (typeof requestTenantId === 'string' && 
            requestTenantId.startsWith('[') && 
            requestTenantId.endsWith(']') &&
            !requestTenantId.includes('[object Object]')) {
            try {
                const parsed = JSON.parse(requestTenantId);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    requestTenantId = parsed[0];
                    // If the first element is an object, extract its _id
                    if (typeof requestTenantId === 'object' && requestTenantId._id) {
                        requestTenantId = requestTenantId._id;
                    }
                }
            } catch (e) {
                console.warn('Error parsing tenant_id array from string:', requestTenantId.substring(0, 50) + '...');
                requestTenantId = null;
            }
        }
        
        // If requestTenantId is still a stringified object, ignore it
        if (typeof requestTenantId === 'string' && 
            (requestTenantId.includes('[object Object]') || requestTenantId === '[object Object]')) {
            requestTenantId = null;
        }

        // AdminMaster pode acessar qualquer tenant
        if (req.usuario.isAdminMaster) {
            return next();
        }

        // For non-AdminMaster users, use their tenant_id
        req.query.tenantId = userTenantId;
        
        // Continue processing
        next();
    } catch (error) {
        console.error('Error in verificarAcessoTenant middleware');
        next(); // Allow the request to continue and let the controller handle errors
    }
};

module.exports = { autorizacaoMiddleware, verificarAcessoTenant };