import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { message, conversation_id } = await req.json();
    if (!message || !conversation_id) {
      return new Response(
        JSON.stringify({ error: "message and conversation_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responderUrl = Deno.env.get("RESPONDER_URL");
    if (!responderUrl) {
      return new Response(
        JSON.stringify({ error: "RESPONDER_URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward to Modal Responder
    const responderResponse = await fetch(responderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        message,
        conversation_id,
      }),
    });

    if (!responderResponse.ok) {
      const errText = await responderResponse.text();
      console.error("Responder error:", responderResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Responder error", details: errText }),
        { status: responderResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pass through the response with its original content type
    const responderContentType = responderResponse.headers.get("content-type") || "application/json";
    
    return new Response(responderResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": responderContentType,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("chat-proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
