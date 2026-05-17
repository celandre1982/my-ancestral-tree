import { useEffect, useState } from 'react';
import { DataMenu } from './components/DataMenu';
import { PersonDetail } from './components/PersonDetail';
import { PersonForm } from './components/PersonForm';
import { PersonList } from './components/PersonList';
import { TreeView } from './components/TreeView';
import { db } from './db/db';
import type { Person } from './types';
import './App.css';

function App() {
  const [editing, setEditing] = useState<Person | null>(null);
  const [viewing, setViewing] = useState<Person | null>(null);
  const [treeRoot, setTreeRoot] = useState<Person | null>(null);

  const openPerson = (p: Person) => {
    setEditing(null);
    setTreeRoot(null);
    setViewing(p);
  };

  const editPerson = (p: Person) => {
    setViewing(null);
    setTreeRoot(null);
    setEditing(p);
  };

  const openTree = (p: Person) => {
    setEditing(null);
    setTreeRoot(p);
  };

  // Tree's onOpen passes an ID — look it up before opening detail.
  const openPersonById = async (id: number) => {
    const p = await db.people.get(id);
    if (p) openPerson(p);
  };

  // If the viewed/edited/rooted person is deleted elsewhere, drop the stale ref.
  useEffect(() => {
    if (viewing?.id == null) return;
    const sub = db.people
      .get(viewing.id)
      .then((p) => !p && setViewing(null));
    return () => {
      void sub;
    };
  }, [viewing?.id]);

  return (
    <main className="app">
      <header>
        <div className="header-top">
          <div>
            <h1>My Ancestral Tree</h1>
            <p className="tagline">A local-first genealogy workspace</p>
          </div>
          <DataMenu />
        </div>
      </header>
      {treeRoot ? (
        <TreeView
          root={treeRoot}
          onOpen={openPersonById}
          onBack={() => setTreeRoot(null)}
        />
      ) : viewing ? (
        <PersonDetail
          person={viewing}
          onEdit={editPerson}
          onOpen={openPerson}
          onViewTree={openTree}
          onClose={() => setViewing(null)}
        />
      ) : (
        <>
          <PersonForm editing={editing} onDone={() => setEditing(null)} />
          <section>
            <h2>People</h2>
            <PersonList onEdit={editPerson} onOpen={openPerson} />
          </section>
        </>
      )}
    </main>
  );
}

export default App;
