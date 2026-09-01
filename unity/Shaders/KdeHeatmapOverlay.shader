Shader "ZhengzhouEast/KDEHeatmapOverlay"
{
    Properties
    {
        _DensityTex ("Normalized Density", 2D) = "black" {}
        _Opacity ("Overlay Opacity", Range(0, 1)) = 0.62
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            sampler2D _DensityTex;
            float4 _DensityTex_ST;
            float _Opacity;

            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; };
            struct v2f { float4 vertex : SV_POSITION; float2 uv : TEXCOORD0; };

            v2f vert(appdata input)
            {
                v2f output;
                output.vertex = UnityObjectToClipPos(input.vertex);
                output.uv = TRANSFORM_TEX(input.uv, _DensityTex);
                return output;
            }

            fixed4 DensityColor(float density)
            {
                // Exact project color thresholds.
                if (density < 0.30) return fixed4(0.298, 0.686, 0.314, 1.0); // #4CAF50
                if (density < 0.60) return fixed4(1.000, 0.922, 0.231, 1.0); // #FFEB3B
                if (density < 0.85) return fixed4(1.000, 0.596, 0.000, 1.0); // #FF9800
                return fixed4(0.957, 0.263, 0.212, 1.0);                    // #F44336
            }

            fixed4 frag(v2f input) : SV_Target
            {
                float density = saturate(tex2D(_DensityTex, input.uv).r);
                fixed4 color = DensityColor(density);
                color.a = density <= 0.001 ? 0 : _Opacity * saturate(0.18 + density * 0.82);
                return color;
            }
            ENDCG
        }
    }
}
