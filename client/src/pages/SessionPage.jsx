import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardPanel } from '../components/CardPanel';
import { sessionApi } from '../api/sessions';
import { studyApi } from '../api/studies';
import { researchApi } from '../api/research';
import './SessionPage.css';

export function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [study, setStudy] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [cards, setCards] = useState([]);
  const [images, setImages] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [selectedCards, setSelectedCards] = useState({});
  const [imageInputs, setImageInputs] = useState({});
  const [message, setMessage] = useState('');
  const [activeModule, setActiveModule] = useState('questionnaire');

  useEffect(() => {
    (async () => {
      try {
        const s = await sessionApi.get(sessionId);
        setSession(s);
        const st = await studyApi.getById(s.study_id);
        setStudy(st);

        const [q, c, i] = await Promise.all([
          studyApi.getQuestions(s.study_id),
          studyApi.getCards(s.study_id),
          studyApi.getImages(s.study_id),
        ]);
        setQuestions(q || []);
        setCards(c || []);
        setImages(i || []);

        if (st.module_order?.[0]) setActiveModule(st.module_order[0]);
      } catch (err) {
        setMessage(err.message);
      }
    })();
  }, [sessionId]);

  const saveQuestionnaire = async () => {
    if (!session) return;
    setMessage('');
    try {
      for (const q of questions) {
        if (questionAnswers[q._id] !== undefined && questionAnswers[q._id] !== '') {
          await researchApi.submitAnswer({
            session_id: session._id,
            question_id: q._id,
            response: questionAnswers[q._id],
          });
        }
      }
      setMessage('Fragebogen gespeichert.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const saveCardSort = async () => {
    if (!session) return;
    setMessage('');
    try {
      const selectedIds = Object.keys(selectedCards).filter((id) => selectedCards[id]);
      await researchApi.submitCardSort({
        session_id: session._id,
        card_groups: [{ group_name: 'Meine Gruppe', card_ids: selectedIds }],
      });
      setMessage('Card Sorting gespeichert.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const saveImageRatings = async () => {
    if (!session) return;
    setMessage('');
    try {
      for (const img of images) {
        const input = imageInputs[img._id];
        if (input?.rating) {
          await researchApi.submitImageRating({
            session_id: session._id,
            image_id: img._id,
            rating: Number(input.rating),
            feedback: input.feedback || '',
            recall_answer: input.recall || '',
          });
        }
      }
      setMessage('Bildbewertungen gespeichert.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const completeSession = async () => {
    if (!session) return;
    try {
      await sessionApi.complete(session._id);
      navigate('/');
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (!session || !study) return <div className="splash">Session wird geladen...</div>;

  const modules = study.module_order?.length ? study.module_order : ['questionnaire', 'card_sort', 'image_rating'];

  return (
    <div className="session-grid">
      <CardPanel title={`Studie: ${study.name}`}>
        <div className="module-tabs">
          {modules.map((m) => (
            <button
              key={m}
              type="button"
              className={m === activeModule ? 'tab active' : 'tab'}
              onClick={() => setActiveModule(m)}
            >
              {m}
            </button>
          ))}
        </div>
        {message && <p className="info-text">{message}</p>}
      </CardPanel>

      {activeModule === 'questionnaire' && (
        <CardPanel title="Fragebogen bearbeiten">
          {questions.length === 0 && <p>Keine Fragen vorhanden.</p>}
          {questions.map((q) => (
            <label className="form-row" key={q._id}>
              <span>{q.text}</span>
              <input
                value={questionAnswers[q._id] || ''}
                onChange={(e) => setQuestionAnswers({ ...questionAnswers, [q._id]: e.target.value })}
              />
            </label>
          ))}
          <button className="primary-btn" onClick={saveQuestionnaire}>Fragebogen speichern</button>
        </CardPanel>
      )}

      {activeModule === 'card_sort' && (
        <CardPanel title="Card Sorting bearbeiten">
          {cards.length === 0 && <p>Keine Cards vorhanden.</p>}
          <div className="check-list">
            {cards.map((c) => (
              <label key={c._id} className="check-item">
                <input
                  type="checkbox"
                  checked={!!selectedCards[c._id]}
                  onChange={(e) => setSelectedCards({ ...selectedCards, [c._id]: e.target.checked })}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
          <button className="primary-btn" onClick={saveCardSort}>Card Sorting speichern</button>
        </CardPanel>
      )}

      {activeModule === 'image_rating' && (
        <CardPanel title="Bildbewertung bearbeiten">
          {images.length === 0 && <p>Keine Bilder vorhanden.</p>}
          {images.map((img) => (
            <div className="image-row" key={img._id}>
              <img
                src={`http://localhost:4000/uploads/${String(img.path || '').split('/').pop()}`}
                alt={img.alt_text || 'image'}
              />
              <div className="image-fields">
                <label className="form-row">
                  <span>Rating (1-5)</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={imageInputs[img._id]?.rating || ''}
                    onChange={(e) =>
                      setImageInputs({
                        ...imageInputs,
                        [img._id]: { ...(imageInputs[img._id] || {}), rating: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="form-row">
                  <span>Feedback</span>
                  <input
                    value={imageInputs[img._id]?.feedback || ''}
                    onChange={(e) =>
                      setImageInputs({
                        ...imageInputs,
                        [img._id]: { ...(imageInputs[img._id] || {}), feedback: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <button className="primary-btn" onClick={saveImageRatings}>Bildbewertungen speichern</button>
        </CardPanel>
      )}

      <CardPanel title="Session Abschluss">
        <button className="primary-btn" onClick={completeSession}>Session abschließen</button>
      </CardPanel>
    </div>
  );
}
