import os
import json
import shutil
from backend.orchestration.pipeline import app, create_initial_state

def generate():
    # 1. Create target directories
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fallback_dir = os.path.join(base_dir, "fallback_dataset")
    fallback_cache_dir = os.path.join(fallback_dir, "cache")
    os.makedirs(fallback_cache_dir, exist_ok=True)
    
    local_cache_dir = os.path.join(base_dir, "backend", "db", "cache")
    
    # 2. Copy local cache files to fallback cache
    if os.path.exists(local_cache_dir):
        for f in os.listdir(local_cache_dir):
            if f.endswith(".json"):
                shutil.copy(
                    os.path.join(local_cache_dir, f),
                    os.path.join(fallback_cache_dir, f)
                )
                print(f"Copied cache file: {f}")
                
    # 3. Execute the full pipeline using mock Claude and local caches
    print("Running pipeline to generate fallback results...")
    initial_state = create_initial_state("attention mechanisms")
    initial_state["sub_queries"] = ["attention mechanisms in transformers"]
    
    final_state = app.invoke(initial_state)
    
    # Convert Pydantic models to serializable dicts
    serializable_state = {
        "query": final_state["query"],
        "filters": final_state["filters"],
        "sub_queries": final_state["sub_queries"],
        "papers": [p.model_dump() for p in final_state["papers"]],
        "extracted_fields": [ef.model_dump() for ef in final_state["extracted_fields"]],
        "summaries": [s.model_dump() for s in final_state["summaries"]],
        "comparison_table": final_state["comparison_table"],
        "graph_ref": final_state["graph_ref"],
        "gap_claims": [gc.model_dump() for gc in final_state["gap_claims"]],
        "report_draft": final_state["report_draft"],
        "agent_status": final_state["agent_status"]
    }
    
    # 4. Save the final state to fallback results
    results_path = os.path.join(fallback_dir, "results_attention_mechanisms.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(serializable_state, f, ensure_ascii=False, indent=2)
        
    print(f"Saved fallback results to {results_path}")

if __name__ == "__main__":
    generate()
