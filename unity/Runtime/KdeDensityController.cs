using System;
using System.Collections.Generic;
using UnityEngine;

namespace ZhengzhouEast.EmergencySimulation
{
    /// <summary>
    /// CPU KDE density calculator. Every frame uses the same Agent transforms as
    /// the crowd simulation and writes a normalized 0-1 density texture for the
    /// heatmap shader. Assign the generated texture to a material using
    /// ZhengzhouEast/KDEHeatmapOverlay.
    /// </summary>
    public sealed class KdeDensityController : MonoBehaviour
    {
        [Serializable]
        public sealed class Region
        {
            public string id = "region";
            public Bounds worldBounds = new Bounds(Vector3.zero, new Vector3(10f, 1f, 10f));
            [Min(1)] public int capacity = 1000;
            public List<Transform> agents = new List<Transform>();
        }

        [SerializeField] private List<Region> regions = new List<Region>();
        [SerializeField] private Bounds mapWorldBounds = new Bounds(Vector3.zero, new Vector3(100f, 1f, 100f));
        [SerializeField, Range(32, 512)] private int textureSize = 128;
        [SerializeField, Min(0.05f)] private float bandwidthMeters = 1.8f;
        [SerializeField, Range(1, 30)] private int refreshRate = 10;
        [SerializeField] private Material heatmapMaterial;

        private Texture2D densityTexture;
        private float[] densityBuffer;
        private Color[] pixelBuffer;
        private float nextRefreshAt;

        public Texture2D DensityTexture => densityTexture;

        private void Awake()
        {
            densityTexture = new Texture2D(textureSize, textureSize, TextureFormat.RFloat, false, true)
            {
                name = "KDE Density 0-1",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp
            };
            densityBuffer = new float[textureSize * textureSize];
            pixelBuffer = new Color[densityBuffer.Length];
            if (heatmapMaterial != null) heatmapMaterial.SetTexture("_DensityTex", densityTexture);
        }

        private void Update()
        {
            if (Time.unscaledTime < nextRefreshAt) return;
            nextRefreshAt = Time.unscaledTime + 1f / Mathf.Max(1, refreshRate);
            RebuildDensityTexture();
        }

        public void RebuildDensityTexture()
        {
            Array.Clear(densityBuffer, 0, densityBuffer.Length);
            foreach (Region region in regions) AccumulateRegion(region);
            for (int index = 0; index < densityBuffer.Length; index++)
            {
                float normalized = Mathf.Clamp01(densityBuffer[index]);
                pixelBuffer[index] = new Color(normalized, 0f, 0f, 1f);
            }
            densityTexture.SetPixels(pixelBuffer);
            densityTexture.Apply(false, false);
        }

        private void AccumulateRegion(Region region)
        {
            if (region.agents.Count == 0 || region.capacity <= 0) return;
            float regionOccupancy = Mathf.Clamp01((float)region.agents.Count / region.capacity);
            float bandwidthSquared = bandwidthMeters * bandwidthMeters;
            float[] raw = new float[densityBuffer.Length];
            float maximum = 0f;

            for (int y = 0; y < textureSize; y++)
            {
                for (int x = 0; x < textureSize; x++)
                {
                    Vector3 sample = TextureToWorld(mapWorldBounds, x, y);
                    if (!region.worldBounds.Contains(sample)) continue;
                    float sum = 0f;
                    foreach (Transform agent in region.agents)
                    {
                        if (agent == null || !region.worldBounds.Contains(agent.position)) continue;
                        Vector2 delta = new Vector2(sample.x - agent.position.x, sample.z - agent.position.z);
                        sum += Mathf.Exp(-delta.sqrMagnitude / (2f * bandwidthSquared));
                    }
                    int index = y * textureSize + x;
                    raw[index] = sum;
                    maximum = Mathf.Max(maximum, sum);
                }
            }

            if (maximum <= Mathf.Epsilon) return;
            for (int index = 0; index < raw.Length; index++)
            {
                float localKde = raw[index] / maximum;
                float normalized = Mathf.Clamp01(regionOccupancy * (0.78f + localKde * 0.30f));
                densityBuffer[index] = Mathf.Max(densityBuffer[index], normalized);
            }
        }

        private Vector3 TextureToWorld(Bounds bounds, int x, int y)
        {
            float u = (x + 0.5f) / textureSize;
            float v = (y + 0.5f) / textureSize;
            return new Vector3(
                Mathf.Lerp(bounds.min.x, bounds.max.x, u),
                bounds.center.y,
                Mathf.Lerp(bounds.min.z, bounds.max.z, v)
            );
        }
    }
}
