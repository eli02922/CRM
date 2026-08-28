import { useEffect, useState } from 'react';
import { opportunitiesApi } from '../api/endpoints';

const STAGE_LABELS = {
  prospecting: 'Prospecting',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
};
const STAGES = Object.keys(STAGE_LABELS);
const NEXT_STAGE = { prospecting: 'qualification', qualification: 'proposal', proposal: 'negotiation', negotiation: 'won' };

export default function PipelinePage() {
  const [board, setBoard] = useState({});
  const [error, setError] = useState('');

  const load = () => {
    opportunitiesApi
      .pipeline()
      .then((res) => setBoard(res.pipeline))
      .catch(() => setError('Failed to load pipeline'));
  };

  useEffect(load, []);

  const advance = async (opp) => {
    const nextStage = NEXT_STAGE[opp.stage];
    if (!nextStage) return;
    await opportunitiesApi.update(opp.id, { stage: nextStage });
    load();
  };

  const markLost = async (opp) => {
    await opportunitiesApi.update(opp.id, { stage: 'lost' });
    load();
  };

  return (
    <div>
      <h1>Sales Pipeline</h1>
      {error && <div className="alert-error">{error}</div>}

      <div className="kanban-board">
        {STAGES.map((stage) => (
          <div className="kanban-column" key={stage}>
            <h3>{STAGE_LABELS[stage]} ({board[stage]?.length || 0})</h3>
            {(board[stage] || []).map((opp) => (
              <div className="kanban-card" key={opp.id}>
                <div className="kanban-card-title">{opp.name}</div>
                <div className="kanban-card-sub">{opp.company_name}</div>
                <div className="kanban-card-amount">${Number(opp.amount).toLocaleString()}</div>
                <div className="kanban-card-actions">
                  <button onClick={() => advance(opp)}>Advance →</button>
                  <button onClick={() => markLost(opp)}>Mark Lost</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
