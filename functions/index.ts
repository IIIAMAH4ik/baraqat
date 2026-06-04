/**
 * Cloudflare Worker — Barakyat Cafe API (Expanded)
 *
 * Routes:
 *   === MENU ===
 *   GET  /api/menu              — all menu items with categories
 *   GET  /api/menu/:cat         — menu items by category
 *
 *   === AUTH & PROFILE ===
 *   GET  /api/profile           — get user profile with stats
 *   PATCH /api/profile          — update user profile
 *
 *   === FAVORITES ===
 *   GET  /api/favorites         — list user's favorites
 *   POST /api/favorites         — add favorite
 *   DELETE /api/favorites/:id   — remove favorite (by menu_item_id)
 *
 *   === RESERVATIONS ===
 *   POST /api/reservations      — create reservation
 *   GET  /api/reservations      — list user's reservations
 *   PATCH /api/reservations/:id — update reservation
 *   DELETE /api/reservations/:id — cancel reservation
 *
 *   === ORDERS ===
 *   POST /api/orders            — create order
 *   GET  /api/orders            — list user's orders
 *   PATCH /api/orders/:id       — update order status
 *   POST /api/orders/:id/reorder — reorder all items from past order
 *
 *   === LOYALTY ===
 *   GET  /api/loyalty           — get loyalty points and tier
 *   GET  /api/loyalty/transactions — transaction history
 *
 *   === PROMO ===
 *   POST /api/promo/validate    — validate promo code
 *   POST /api/promo/claim       — claim lead magnet promo
 *
 *   === BANQUET ===
 *   POST /api/banquet           — submit banquet request
 *   GET  /api/banquet           — list user's banquet requests
 *
 *   === DELIVERY ===
 *   GET  /api/delivery/zones    — active delivery zones
 *   POST /api/delivery/calculate — calculate delivery fee & time
 *
 *   === ADMIN ===
 *   GET  /api/analytics/summary      — analytics summary
 *   GET  /api/analytics/detailed     — detailed analytics
 *   GET  /api/admin/orders           — all orders (staff)
 *   GET  /api/admin/inventory        — inventory list (staff)
 *   GET  /api/admin/staff            — staff list (admin/manager)
 *   GET  /api/admin/recipes          — recipes with ingredients
 *   POST /api/admin/recipes          — create/update recipe
 *   GET  /api/admin/suppliers        — suppliers list
 *   POST /api/admin/suppliers        — create supplier
 *   POST /api/admin/notifications/send — send notification
 *   POST /api/admin/stop-list/sync   — auto-sync stop-list from inventory
 *   GET  /api/admin/activity-logs    — staff activity logs
 */

const SUPABASE_URL = "https://cfylbrpqbvbfmrcnpqxo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmeWxicnBxYnZiZm1yY25wcXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNjU1NDAsImV4cCI6MjA2NDY0MTU0MH0.QWgQJxGYHyenjnZJqkYI8yjMUzeOsK2qTWm9UM83B-4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getUserId(req: Request): string | null {
  return req.headers.get("X-Rork-User-Id");
}

async function supabaseQuery<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${res.status} ${err}`);
  }
  return res.json();
}

function generatePromoCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BAR-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function requireAuth(req: Request): string {
  const userId = getUserId(req);
  if (!userId) throw new AuthError("Unauthorized");
  return userId;
}

class AuthError extends Error {
  constructor(message: string) { super(message); this.name = "AuthError"; }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === "/ping") {
        return json({ ok: true, now: new Date().toISOString() });
      }

      // ============================================================
      // MENU
      // ============================================================
      if (path === "/api/menu" && method === "GET") {
        const cat = url.searchParams.get("category");
        let query = `menu_items?select=*&order=sort_order`;
        if (cat) query += `&category_id=eq.${cat}`;

        const [items, categories] = await Promise.all([
          supabaseQuery<unknown[]>(query),
          supabaseQuery<unknown[]>("menu_categories?select=*&order=sort_order"),
        ]);
        return json({ items, categories, updatedAt: new Date().toISOString() });
      }

      // ============================================================
      // ADMIN: MENU CRUD
      // ============================================================
      if (path === "/api/admin/menu" && method === "POST") {
        const body = await request.json() as Record<string, unknown>;
        if (!body.name || !body.category_id) return json({ error: "name and category_id required" }, 400);
        const data = await supabaseQuery<unknown[]>("menu_items", {
          method: "POST",
          body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
          headers: { Prefer: "return=representation" },
        });
        return json(data, 201);
      }

      if (path.startsWith("/api/admin/menu/") && method === "PUT") {
        const itemId = path.split("/").pop();
        const body = await request.json() as Record<string, unknown>;
        const data = await supabaseQuery<unknown[]>(`menu_items?id=eq.${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
          headers: { Prefer: "return=representation" },
        });
        return json(data);
      }

      if (path.startsWith("/api/admin/menu/") && method === "DELETE") {
        const itemId = path.split("/").pop();
        await supabaseQuery(`menu_items?id=eq.${itemId}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
        return json({ success: true });
      }

      // ============================================================
      // PROFILE
      // ============================================================
      if (path === "/api/profile" && method === "GET") {
        const userId = requireAuth(request);
        const [profile, loyalty, orders] = await Promise.all([
          supabaseQuery<unknown[]>(`profiles?select=*&id=eq.${userId}&limit=1`),
          supabaseQuery<unknown[]>(`loyalty_points?select=*&user_id=eq.${userId}&limit=1`),
          supabaseQuery<unknown[]>(`orders?select=id,total,status,created_at&user_id=eq.${userId}&order=created_at.desc&limit=100`),
        ]);

        const prof = (profile as unknown[])[0] as Record<string, unknown> | undefined;
        const loy = (loyalty as unknown[])[0] as Record<string, unknown> | undefined;
        const ords = orders as Array<Record<string, unknown>>;

        const totalSpent = ords.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const completedOrders = ords.filter(o => o.status === "completed").length;

        return json({
          profile: prof || null,
          loyalty: loy || null,
          stats: {
            totalSpent,
            totalOrders: ords.length,
            completedOrders,
            visitsCount: completedOrders,
          },
        });
      }

      if (path === "/api/profile" && method === "PATCH") {
        const userId = requireAuth(request);
        const body = await request.json() as Record<string, unknown>;
        const allowed = ["name", "phone", "email", "birthday", "avatar_url"];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const key of allowed) {
          if (key in body) updates[key] = body[key];
        }
        const data = await supabaseQuery<unknown[]>(`profiles?id=eq.${userId}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
          headers: { Prefer: "return=representation" },
        });
        return json(data);
      }

      // ============================================================
      // FAVORITES
      // ============================================================
      if (path === "/api/favorites" && method === "GET") {
        const userId = requireAuth(request);
        try {
          const data = await supabaseQuery<unknown[]>(
            `favorites?select=*,menu_items(*)&user_id=eq.${userId}&order=created_at.desc`
          );
          return json(data);
        } catch {
          return json([]);
        }
      }

      if (path === "/api/favorites" && method === "POST") {
        const userId = requireAuth(request);
        const body = await request.json() as { menu_item_id: string };
        if (!body.menu_item_id) return json({ error: "menu_item_id is required" }, 400);
        try {
          const data = await supabaseQuery<unknown[]>("favorites", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, menu_item_id: body.menu_item_id }),
            headers: { Prefer: "return=representation" },
          });
          return json(data, 201);
        } catch {
          return json({ error: "Favorites table not available" }, 503);
        }
      }

      if (path.startsWith("/api/favorites/") && method === "DELETE") {
        const userId = requireAuth(request);
        const menuItemId = path.split("/").pop()!;
        try {
          await supabaseQuery(`favorites?user_id=eq.${userId}&menu_item_id=eq.${menuItemId}`, {
            method: "DELETE",
            headers: { Prefer: "return=minimal" },
          });
        } catch { /* table may not exist */ }
        return json({ success: true });
      }

      // ============================================================
      // RESERVATIONS
      // ============================================================
      if (path === "/api/reservations" && method === "POST") {
        const body = await request.json() as Record<string, unknown>;
        const userId = getUserId(request);
        const newRes = await supabaseQuery<unknown[]>("reservations", {
          method: "POST",
          body: JSON.stringify({
            ...body,
            user_id: userId || null,
            status: "pending",
          }),
          headers: { Prefer: "return=representation" },
        });
        return json(newRes, 201);
      }

      if (path === "/api/reservations" && method === "GET") {
        const userId = requireAuth(request);
        const data = await supabaseQuery<unknown[]>(
          `reservations?select=*&user_id=eq.${userId}&order=created_at.desc`
        );
        return json(data);
      }

      if (path.startsWith("/api/reservations/") && method === "PATCH") {
        const userId = requireAuth(request);
        const reservationId = path.split("/").pop();
        const body = await request.json() as Record<string, unknown>;
        const data = await supabaseQuery<unknown[]>(
          `reservations?id=eq.${reservationId}&user_id=eq.${userId}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
            headers: { Prefer: "return=representation" },
          }
        );
        return json(data);
      }

      if (path.startsWith("/api/reservations/") && method === "DELETE") {
        const userId = requireAuth(request);
        const reservationId = path.split("/").pop();
        await supabaseQuery(`reservations?id=eq.${reservationId}&user_id=eq.${userId}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
        return json({ success: true });
      }

      // ============================================================
      // ORDERS
      // ============================================================
      if (path === "/api/orders" && method === "POST") {
        const userId = requireAuth(request);
        const body = await request.json() as Record<string, unknown>;
        const { items, ...orderData } = body;

        const newOrder = await supabaseQuery<unknown[]>("orders", {
          method: "POST",
          body: JSON.stringify({
            ...orderData,
            user_id: userId,
            status: "pending",
          }),
          headers: { Prefer: "return=representation" },
        });

        const orderRecord = (newOrder as unknown[])[0] as Record<string, unknown> | undefined;

        if (Array.isArray(items) && orderRecord) {
          const orderId = orderRecord.id;
          for (const item of items as Record<string, unknown>[]) {
            await supabaseQuery("order_items", {
              method: "POST",
              body: JSON.stringify({ ...item, order_id: orderId }),
              headers: { Prefer: "return=minimal" },
            });
          }

          // ============================================================
          // DEDUCT INGREDIENTS FROM INVENTORY
          // ============================================================
          try {
            // Fetch recipes for all menu items in this order
            const menuItemIds = (items as Record<string, unknown>[]).map((i) => i.menu_item_id);
            const uniqueIds = [...new Set(menuItemIds)];
            if (uniqueIds.length > 0) {
              const recipes = await supabaseQuery<unknown[]>(
                `recipes?select=*,recipe_ingredients(*,ingredients(*))&menu_item_id=in.(${uniqueIds.join(",")})`
              ) as Array<Record<string, unknown>>;

              for (const recipe of recipes) {
                const orderItem = (items as Record<string, unknown>[]).find(
                  (i) => i.menu_item_id === recipe.menu_item_id
                );
                if (!orderItem) continue;
                const qty = Number(orderItem.quantity) || 1;
                const riList = recipe.recipe_ingredients as Array<Record<string, unknown>> || [];

                for (const ri of riList) {
                  const ing = ri.ingredients as Record<string, unknown> | undefined;
                  if (!ing) continue;
                  const riQty = Number(ri.quantity) || 0;
                  const totalConsumed = riQty * qty;
                  const currentStock = Number(ing.current_stock) || 0;
                  const newStock = Math.max(0, currentStock - totalConsumed);
                  const ingredientId = ing.id as string;

                  await Promise.all([
                    supabaseQuery(`ingredients?id=eq.${ingredientId}`, {
                      method: "PATCH",
                      body: JSON.stringify({ current_stock: newStock, updated_at: new Date().toISOString() }),
                      headers: { Prefer: "return=minimal" },
                    }),
                    supabaseQuery("inventory_transactions", {
                      method: "POST",
                      body: JSON.stringify({
                        ingredient_id: ingredientId,
                        type: "out",
                        quantity: totalConsumed,
                        note: `Списание по заказу #${(orderId as string).slice(-6)}`,
                      }),
                      headers: { Prefer: "return=minimal" },
                    }),
                  ]);
                }
              }
            }
          } catch (e) {
            console.error("Ingredient deduction failed:", e);
            // Don't fail the order — deduction is best-effort
          }

          // ============================================================
          // AWARD LOYALTY POINTS (5% of order total)
          // ============================================================
          try {
            const total = Number(orderRecord.total) || 0;
            const bonusEarned = Math.round(total * 0.05);
            if (bonusEarned > 0) {
              const lpRes = await supabaseQuery<unknown[]>(
                `loyalty_points?select=id,points,total_earned,total_spent,tier&user_id=eq.${userId}&limit=1`
              );
              const lp = (lpRes as unknown[])[0] as Record<string, unknown> | undefined;

              if (lp) {
                const newPoints = (Number(lp.points) || 0) + bonusEarned;
                const newEarned = (Number(lp.total_earned) || 0) + bonusEarned;
                const newSpent = (Number(lp.total_spent) || 0) + total;

                let tier = "bronze";
                if (newSpent >= 100000) tier = "platinum";
                else if (newSpent >= 50000) tier = "gold";
                else if (newSpent >= 20000) tier = "silver";

                await Promise.all([
                  supabaseQuery(`loyalty_points?user_id=eq.${userId}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      points: newPoints,
                      total_earned: newEarned,
                      total_spent: newSpent,
                      tier,
                      updated_at: new Date().toISOString(),
                    }),
                    headers: { Prefer: "return=minimal" },
                  }),
                  supabaseQuery("loyalty_transactions", {
                    method: "POST",
                    body: JSON.stringify({
                      user_id: userId,
                      type: "earn",
                      amount: bonusEarned,
                      description: `Заказ #${(orderId as string).slice(-6)}`,
                      order_id: orderId,
                    }),
                    headers: { Prefer: "return=minimal" },
                  }),
                ]);
              }
            }
          } catch (e) {
            console.error("Loyalty accrual failed:", e);
          }

          // ============================================================
          // LOG ACTIVITY
          // ============================================================
          await supabaseQuery("action_logs", {
            method: "POST",
            body: JSON.stringify({
              user_id: userId,
              action: "order_created",
              entity_type: "order",
              entity_id: orderId,
              details: { item_count: (items as unknown[]).length, total: orderRecord.total },
            }),
            headers: { Prefer: "return=minimal" },
          });
        }
        return json(newOrder, 201);
      }

      if (path === "/api/orders" && method === "GET") {
        const userId = requireAuth(request);
        const status = url.searchParams.get("status");
        let query = `orders?select=*,order_items(*)&user_id=eq.${userId}&order=created_at.desc`;
        if (status) query += `&status=eq.${status}`;
        const data = await supabaseQuery<unknown[]>(query);
        return json(data);
      }

      if (path.startsWith("/api/orders/") && path.endsWith("/reorder") && method === "POST") {
        const userId = requireAuth(request);
        const orderId = path.split("/")[3];
        const orderItems = await supabaseQuery<unknown[]>(
          `order_items?select=menu_item_id,name,price,quantity,modifiers,notes&order_id=eq.${orderId}`
        );
        return json({ items: orderItems, message: "Items ready for reorder" });
      }

      if (path.startsWith("/api/orders/") && method === "PATCH") {
        const userId = getUserId(request);
        if (!userId) return json({ error: "Unauthorized" }, 401);
        const orderId = path.split("/").pop();
        const body = await request.json() as Record<string, unknown>;
        const data = await supabaseQuery<unknown[]>(`orders?id=eq.${orderId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
          headers: { Prefer: "return=representation" },
        });
        // Log activity
        if (body.status) {
          await supabaseQuery("action_logs", {
            method: "POST",
            body: JSON.stringify({
              user_id: userId,
              action: "order_status_changed",
              entity_type: "order",
              entity_id: orderId,
              details: { new_status: body.status },
            }),
            headers: { Prefer: "return=minimal" },
          });
        }
        return json(data);
      }

      // ============================================================
      // LOYALTY
      // ============================================================
      if (path === "/api/loyalty" && method === "GET") {
        const userId = requireAuth(request);
        try {
          const data = await supabaseQuery<unknown[]>(
            `loyalty_points?select=*&user_id=eq.${userId}&limit=1`
          );
          const points = (data as unknown[])[0];
          if (points) return json(points);
        } catch { /* table may not exist */ }
        // Auto-create loyalty record if missing
        try {
          await supabaseQuery("loyalty_points", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, points: 0, tier: "bronze", total_earned: 0, total_spent: 0 }),
            headers: { Prefer: "return=representation" },
          });
        } catch { /* best effort */ }
        return json({ points: 0, tier: "bronze", total_earned: 0, total_spent: 0 });
      }

      if (path === "/api/loyalty/transactions" && method === "GET") {
        const userId = requireAuth(request);
        const data = await supabaseQuery<unknown[]>(
          `loyalty_transactions?select=*&user_id=eq.${userId}&order=created_at.desc&limit=50`
        );
        return json(data);
      }

      // ============================================================
      // PROMO CODES
      // ============================================================
      if (path === "/api/promo/validate" && method === "POST") {
        const body = await request.json() as { code: string };
        const data = await supabaseQuery<unknown[]>(
          `promo_codes?select=*&code=eq.${body.code}&is_active=eq.true`
        );
        const promo = (data as unknown[])[0] as Record<string, unknown> | undefined;
        if (!promo) return json({ valid: false, error: "Промокод не найден" });
        if (promo.max_uses && (promo.used_count as number) >= (promo.max_uses as number)) {
          return json({ valid: false, error: "Промокод исчерпан" });
        }
        if (promo.expires_at && new Date(promo.expires_at as string) < new Date()) {
          return json({ valid: false, error: "Промокод истёк" });
        }
        return json({ valid: true, promo });
      }

      if (path === "/api/promo/claim" && method === "POST") {
        const body = await request.json() as { name: string; phone: string };
        if (!body.name || !body.phone) {
          return json({ error: "Имя и телефон обязательны" }, 400);
        }
        const code = generatePromoCode();
        const data = await supabaseQuery<unknown[]>("promo_codes", {
          method: "POST",
          body: JSON.stringify({
            code,
            type: "gift",
            value: 0,
            min_order: 0,
            max_uses: 1,
            used_count: 0,
            is_active: true,
            customer_name: body.name,
            customer_phone: body.phone,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
          headers: { Prefer: "return=representation" },
        });
        return json({ success: true, promoCode: code, data }, 201);
      }

      // ============================================================
      // BANQUET REQUESTS
      // ============================================================
      if (path === "/api/banquet" && method === "POST") {
        const body = await request.json() as Record<string, unknown>;
        const userId = getUserId(request);
        try {
          const data = await supabaseQuery<unknown[]>("banquet_requests", {
            method: "POST",
            body: JSON.stringify({
              ...body,
              user_id: userId || null,
              status: "pending",
            }),
            headers: { Prefer: "return=representation" },
          });
          return json(data, 201);
        } catch {
          return json({ error: "Banquet requests not available yet" }, 503);
        }
      }

      if (path === "/api/banquet" && method === "GET") {
        const userId = requireAuth(request);
        try {
          const data = await supabaseQuery<unknown[]>(
            `banquet_requests?select=*&user_id=eq.${userId}&order=created_at.desc`
          );
          return json(data);
        } catch {
          return json([]);
        }
      }

      // ============================================================
      // DELIVERY ZONES
      // ============================================================
      if (path === "/api/delivery/zones" && method === "GET") {
        try {
          const data = await supabaseQuery<unknown[]>("delivery_zones?select=*&is_active=eq.true&order=name");
          return json(data);
        } catch {
          return json([]);
        }
      }

      if (path === "/api/delivery/calculate" && method === "POST") {
        const body = await request.json() as { address: string; lat?: number; lng?: number };
        let zones: Array<Record<string, unknown>> = [];
        try {
          const defaultZone = await supabaseQuery<unknown[]>("delivery_zones?select=*&is_active=eq.true&limit=1");
          zones = (defaultZone as Array<Record<string, unknown>>) || [];
        } catch { /* table may not exist */ }
        const deliveryFee = zones.length > 0 && zones[0].base_fee ? Number(zones[0].base_fee) : 200;
        const estimatedMinutes = zones.length > 0 && zones[0].estimated_minutes ? Number(zones[0].estimated_minutes) : 30;
        return json({
          address: body.address,
          deliveryFee,
          estimatedMinutes,
          zone: zones[0] || null,
        });
      }

      // ============================================================
      // ANALYTICS
      // ============================================================
      if (path === "/api/analytics/summary" && method === "GET") {
        const [orders, recentAnalytics] = await Promise.all([
          supabaseQuery<unknown[]>("orders?select=total,status,created_at&order=created_at.desc&limit=200"),
          supabaseQuery<unknown[]>("daily_analytics?select=*&order=date.desc&limit=30"),
        ]);
        const ords = orders as Array<Record<string, unknown>>;
        const totalRevenue = ords.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const completedOrders = ords.filter(o => o.status === "completed").length;
        const avgCheck = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;

        return json({
          totalRevenue,
          totalOrders: ords.length,
          avgCheck,
          recentOrders: ords.slice(0, 10),
          dailyAnalytics: recentAnalytics,
        });
      }

      if (path === "/api/analytics/detailed" && method === "GET") {
        const [orders, profiles, menuItems] = await Promise.all([
          supabaseQuery<unknown[]>("orders?select=total,status,created_at,user_id&order=created_at.desc&limit=500"),
          supabaseQuery<unknown[]>("profiles?select=id,created_at"),
          supabaseQuery<unknown[]>("menu_items?select=id,name,price,category_id"),
        ]);

        const ords = orders as Array<Record<string, unknown>>;
        const profs = profiles as Array<Record<string, unknown>>;
        const items = menuItems as Array<Record<string, unknown>>;

        // Revenue by month
        const revenueByMonth: Record<string, number> = {};
        const now = new Date();
        for (let i = 0; i < 12; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          revenueByMonth[key] = 0;
        }

        for (const o of ords) {
          const d = new Date(o.created_at as string);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (revenueByMonth[key] !== undefined) {
            revenueByMonth[key] += Number(o.total) || 0;
          }
        }

        const uniqueCustomers = new Set(ords.map(o => o.user_id)).size;
        const totalCustomers = profs.length;

        const completed = ords.filter(o => o.status === "completed");
        const avgCheck = completed.length > 0
          ? Math.round(completed.reduce((s, o) => s + (Number(o.total) || 0), 0) / completed.length)
          : 0;

        return json({
          totalRevenue: ords.reduce((s, o) => s + (Number(o.total) || 0), 0),
          totalOrders: ords.length,
          uniqueCustomers,
          totalCustomers,
          avgCheck,
          revenueByMonth,
          menuItemCount: items.length,
        });
      }

      // ============================================================
      // ADMIN: ORDERS
      // ============================================================
      if (path === "/api/admin/orders" && method === "GET") {
        const status = url.searchParams.get("status");
        let query = "orders?select=*,order_items(*)&order=created_at.desc&limit=100";
        if (status) query += `&status=eq.${status}`;
        const data = await supabaseQuery<unknown[]>(query);
        return json(data);
      }

      // ============================================================
      // ADMIN: INVENTORY
      // ============================================================
      if (path === "/api/admin/inventory" && method === "GET") {
        const data = await supabaseQuery<unknown[]>(
          "ingredients?select=*,suppliers(*)&order=name"
        );
        return json(data);
      }

      // ============================================================
      // ADMIN: STAFF
      // ============================================================
      if (path === "/api/admin/staff" && method === "GET") {
        const data = await supabaseQuery<unknown[]>(
          "employees?select=*&order=position"
        );
        return json(data);
      }

      // ============================================================
      // ADMIN: RECIPES
      // ============================================================
      if (path === "/api/admin/recipes" && method === "GET") {
        const data = await supabaseQuery<unknown[]>(
          "recipes?select=*,recipe_ingredients(*,ingredients(*)),menu_items(name,price,category_id)"
        );
        return json(data);
      }

      if (path === "/api/admin/recipes" && method === "POST") {
        const body = await request.json() as {
          menu_item_id: string;
          instructions?: string;
          prep_time_minutes?: number;
          ingredients: { ingredient_id: string; quantity: number; unit: string }[];
        };

        if (!body.menu_item_id) return json({ error: "menu_item_id is required" }, 400);

        const recipeData = await supabaseQuery<unknown[]>("recipes", {
          method: "POST",
          body: JSON.stringify({
            menu_item_id: body.menu_item_id,
            instructions: body.instructions || null,
            prep_time_minutes: body.prep_time_minutes || null,
          }),
          headers: { Prefer: "return=representation" },
        });

        const recipe = (recipeData as unknown[])[0] as Record<string, unknown> | undefined;
        if (recipe && body.ingredients?.length) {
          await supabaseQuery(`recipe_ingredients?recipe_id=eq.${recipe.id}`, {
            method: "DELETE",
            headers: { Prefer: "return=minimal" },
          });
          for (const ing of body.ingredients) {
            await supabaseQuery("recipe_ingredients", {
              method: "POST",
              body: JSON.stringify({
                recipe_id: recipe.id,
                ingredient_id: ing.ingredient_id,
                quantity: ing.quantity,
                unit: ing.unit,
              }),
              headers: { Prefer: "return=minimal" },
            });
          }
        }
        return json(recipe, 201);
      }

      // ============================================================
      // ADMIN: SUPPLIERS
      // ============================================================
      if (path === "/api/admin/suppliers" && method === "GET") {
        const data = await supabaseQuery<unknown[]>(
          "suppliers?select=*&order=name"
        );
        return json(data);
      }

      if (path === "/api/admin/suppliers" && method === "POST") {
        const body = await request.json() as Record<string, unknown>;
        if (!body.name) return json({ error: "name is required" }, 400);
        const data = await supabaseQuery<unknown[]>("suppliers", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { Prefer: "return=representation" },
        });
        return json(data, 201);
      }

      // ============================================================
      // ADMIN: NOTIFICATIONS
      // ============================================================
      if (path === "/api/admin/notifications/send" && method === "POST") {
        const body = await request.json() as {
          user_id?: string;
          title: string;
          body: string;
          type?: string;
          data?: Record<string, unknown>;
        };
        if (!body.title || !body.body) return json({ error: "title and body required" }, 400);

        const notification = await supabaseQuery<unknown[]>("notifications", {
          method: "POST",
          body: JSON.stringify({
            user_id: body.user_id || null,
            title: body.title,
            body: body.body,
            type: body.type || "system",
            data: body.data || null,
          }),
          headers: { Prefer: "return=representation" },
        });
        return json({ success: true, notification }, 201);
      }

      // ============================================================
      // ADMIN: STOP-LIST AUTO-SYNC
      // ============================================================
      if (path === "/api/admin/stop-list/sync" && method === "POST") {
        const recipes = await supabaseQuery<unknown[]>(
          "recipes?select=*,recipe_ingredients(*,ingredients(*))"
        ) as Array<Record<string, unknown>>;

        const updated: string[] = [];
        for (const recipe of recipes) {
          const ingredients = (recipe.recipe_ingredients as Array<Record<string, unknown>>) || [];
          const anyLow = ingredients.some((ri) => {
            const ing = ri.ingredients as Record<string, unknown> | undefined;
            if (!ing) return false;
            return Number(ing.current_stock) <= Number(ing.min_stock);
          });
          if (anyLow && recipe.menu_item_id) {
            await supabaseQuery(`menu_items?id=eq.${recipe.menu_item_id}`, {
              method: "PATCH",
              body: JSON.stringify({ available: false, updated_at: new Date().toISOString() }),
              headers: { Prefer: "return=minimal" },
            });
            updated.push(recipe.menu_item_id as string);
          }
        }
        return json({ success: true, itemsDisabled: updated.length, items: updated });
      }

      // ============================================================
      // ADMIN: ACTIVITY LOGS
      // ============================================================
      if (path === "/api/admin/activity-logs" && method === "GET") {
        const limit = url.searchParams.get("limit") || "50";
        const data = await supabaseQuery<unknown[]>(
          `action_logs?select=*&order=created_at.desc&limit=${limit}`
        );
        return json(data);
      }

      // ============================================================
      // ADMIN: INVENTORY TRANSACTIONS (detailed history)
      // ============================================================
      if (path === "/api/admin/inventory/transactions" && method === "GET") {
        const ingredientId = url.searchParams.get("ingredient_id");
        let query = "inventory_transactions?select=*&order=created_at.desc&limit=100";
        if (ingredientId) query += `&ingredient_id=eq.${ingredientId}`;
        const data = await supabaseQuery<unknown[]>(query);
        return json(data);
      }

      // ============================================================
      // ADMIN: INVENTORY STOCK ADJUST
      // ============================================================
      if (path === "/api/admin/inventory/adjust" && method === "POST") {
        const body = await request.json() as { ingredient_id: string; quantity: number; type: string; note?: string; price?: number };
        if (!body.ingredient_id || !body.quantity || !body.type) {
          return json({ error: "ingredient_id, quantity, and type required" }, 400);
        }

        const ing = await supabaseQuery<unknown[]>(`ingredients?id=eq.${body.ingredient_id}&limit=1`);
        const ingredient = (ing as unknown[])[0] as Record<string, unknown> | undefined;
        if (!ingredient) return json({ error: "Ingredient not found" }, 404);

        const currentStock = Number(ingredient.current_stock) || 0;
        const newStock = body.type === "in"
          ? currentStock + body.quantity
          : Math.max(0, currentStock - body.quantity);

        await Promise.all([
          supabaseQuery(`ingredients?id=eq.${body.ingredient_id}`, {
            method: "PATCH",
            body: JSON.stringify({ current_stock: newStock, updated_at: new Date().toISOString() }),
            headers: { Prefer: "return=minimal" },
          }),
          supabaseQuery("inventory_transactions", {
            method: "POST",
            body: JSON.stringify({
              ingredient_id: body.ingredient_id,
              type: body.type,
              quantity: body.quantity,
              note: body.note || (body.type === "in" ? "Приход" : "Расход"),
              price: body.price || null,
            }),
            headers: { Prefer: "return=minimal" },
          }),
        ]);
        return json({ success: true, new_stock: newStock });
      }

      // ============================================================
      // ADMIN: STAFF CRUD
      // ============================================================
      if (path === "/api/admin/staff" && method === "POST") {
        const body = await request.json() as Record<string, unknown>;
        if (!body.position) return json({ error: "position required" }, 400);
        const data = await supabaseQuery<unknown[]>("employees", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { Prefer: "return=representation" },
        });
        return json(data, 201);
      }

      if (path.startsWith("/api/admin/staff/") && method === "PUT") {
        const employeeId = path.split("/").pop();
        const body = await request.json() as Record<string, unknown>;
        const data = await supabaseQuery<unknown[]>(`employees?id=eq.${employeeId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
          headers: { Prefer: "return=representation" },
        });
        return json(data);
      }

      if (path.startsWith("/api/admin/staff/") && method === "DELETE") {
        const employeeId = path.split("/").pop();
        await supabaseQuery(`employees?id=eq.${employeeId}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
        return json({ success: true });
      }

      // ============================================================
      // ADMIN: PROMO CRUD
      // ============================================================
      if (path === "/api/admin/promos" && method === "GET") {
        const data = await supabaseQuery<unknown[]>("promo_codes?select=*&order=created_at.desc&limit=100");
        return json(data);
      }

      if (path === "/api/admin/promos" && method === "POST") {
        const body = await request.json() as Record<string, unknown>;
        if (!body.code || !body.type) return json({ error: "code and type required" }, 400);
        const data = await supabaseQuery<unknown[]>("promo_codes", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { Prefer: "return=representation" },
        });
        return json(data, 201);
      }

      if (path.startsWith("/api/admin/promos/") && method === "PUT") {
        const promoId = path.split("/").pop();
        const body = await request.json() as Record<string, unknown>;
        const data = await supabaseQuery<unknown[]>(`promo_codes?id=eq.${promoId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
          headers: { Prefer: "return=representation" },
        });
        return json(data);
      }

      if (path.startsWith("/api/admin/promos/") && method === "DELETE") {
        const promoId = path.split("/").pop();
        await supabaseQuery(`promo_codes?id=eq.${promoId}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
        return json({ success: true });
      }

      // ============================================================
      // ADMIN: PRICE RULES CRUD
      // ============================================================
      if (path === "/api/admin/price-rules" && method === "GET") {
        const data = await supabaseQuery<unknown[]>("price_rules?select=*&order=created_at.desc");
        return json(data);
      }

      if (path === "/api/admin/price-rules" && method === "POST") {
        const body = await request.json() as Record<string, unknown>;
        const data = await supabaseQuery<unknown[]>("price_rules", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { Prefer: "return=representation" },
        });
        return json(data, 201);
      }

      // ============================================================
      // 404
      // ============================================================
      return json({ error: "Not found" }, 404);
    } catch (err) {
      if (err instanceof AuthError) {
        return json({ error: err.message }, 401);
      }
      console.error("API error:", err);
      return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
    }
  },
};
