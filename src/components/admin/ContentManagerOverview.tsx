import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Images,
  Layers,
  Loader2,
  Package as PackageIcon,
} from "lucide-react";
import { DEMO_MODE } from "../../lib/config";
import {
  fetchContentPacks,
  fetchContentSets,
  fetchSetImageCounts,
  type ContentPack,
  type ContentSet,
} from "../../lib/contentCms";

/**
 * The two primary management areas shown on the admin dashboard. Homepage
 * section names never appear here — the structure is Sets and Packs only.
 */
export function ContentManagerOverview() {
  const [sets, setSets] = useState<ContentSet[]>([]);
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (DEMO_MODE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextSets, nextPacks, nextCounts] = await Promise.all([
        fetchContentSets(),
        fetchContentPacks(),
        fetchSetImageCounts(),
      ]);
      setSets(nextSets);
      setPacks(nextPacks);
      setCounts(nextCounts);
    } catch (nextError) {
      // A missing migration should not break the rest of the dashboard.
      setSets([]);
      setPacks([]);
      setCounts({});
      setError(
        nextError instanceof Error ? nextError.message : "Could not load sets and packs.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setNames = new Map(sets.map((set) => [set.id, set.name]));

  return (
    <div className="admin-cms-overview">
      <div className="admin-cms-overview-intro">
        <p className="eyebrow"><Layers size={14} /> Sets &amp; packs</p>
        <h2>Image &amp; pack management</h2>
        <p>
          Sets are reusable image albums. Packs are independently managed content packs.
          Assign several packs to the same set and they share one album. Homepage sections
          are display-only and never appear in this structure.
        </p>
      </div>

      {error && (
        <p className="admin-cms-overview-error">
          Could not load Sets &amp; Packs. Run the latest Supabase migration
          (<code>content_sets</code>, <code>content_packs</code>, <code>set_images</code>).
        </p>
      )}

      <div className="admin-cms-overview-grid">
        <section className="admin-cms-overview-card">
          <div className="admin-cms-overview-head">
            <span className="admin-cms-overview-icon"><Layers size={18} /></span>
            <div>
              <p className="eyebrow">Sets</p>
              <h2>Shared image albums</h2>
            </div>
            <span className="admin-cms-overview-count">{sets.length}</span>
          </div>

          <p className="admin-cms-overview-copy">
            Set 1, Set 2, Set 3… — reusable albums you can assign to any pack.
          </p>

          {loading ? (
            <div className="admin-cms-overview-loading">
              <Loader2 size={18} className="spin" /> Loading sets…
            </div>
          ) : sets.length ? (
            <ul className="admin-cms-overview-list">
              {sets.slice(0, 6).map((set) => (
                <li key={set.id}>
                  <Link to={`/admin/sets/${set.id}`}>
                    <span>{set.name}</span>
                    <small>
                      <Images size={12} /> {counts[set.id] ?? 0}
                    </small>
                    <ArrowRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-cms-overview-empty">No sets yet.</p>
          )}

          <div className="admin-cms-overview-actions">
            <Link to="/admin/sets" className="btn btn--primary btn--sm">
              <Layers size={14} /> Manage sets
            </Link>
          </div>
        </section>

        <section className="admin-cms-overview-card">
          <div className="admin-cms-overview-head">
            <span className="admin-cms-overview-icon admin-cms-overview-icon--pack">
              <PackageIcon size={18} />
            </span>
            <div>
              <p className="eyebrow">Packs</p>
              <h2>Independent content packs</h2>
            </div>
            <span className="admin-cms-overview-count">{packs.length}</span>
          </div>

          <p className="admin-cms-overview-copy">
            Pack 1, Pack 2, Pack 3… — manage each pack on its own dedicated page.
          </p>

          {loading ? (
            <div className="admin-cms-overview-loading">
              <Loader2 size={18} className="spin" /> Loading packs…
            </div>
          ) : packs.length ? (
            <ul className="admin-cms-overview-list">
              {packs.slice(0, 6).map((pack) => (
                <li key={pack.id}>
                  <Link to={`/admin/packs/${pack.id}`}>
                    <span>{pack.name}</span>
                    <small>
                      {pack.set_id ? setNames.get(pack.set_id) ?? "Set" : "No set"}
                    </small>
                    <ArrowRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-cms-overview-empty">No packs yet.</p>
          )}

          <div className="admin-cms-overview-actions">
            <Link to="/admin/packs" className="btn btn--primary btn--sm">
              <PackageIcon size={14} /> Manage packs
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
