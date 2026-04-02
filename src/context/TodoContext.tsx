import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Todo } from '../types/Todo';
import * as todoService from '../api/todos';

export const FILTER_TYPE = {
  ALL: 'all',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

export const ERROR_TYPE = {
  LOAD: 'loadError',
  TITLE: 'titleError',
  ADD: 'addError',
  DELETE: 'deleteError',
  UPDATE: 'updateError',
  NONE: 'none',
} as const;

interface TodoContextType {
  todos: Todo[];
  todoTitle: string;
  filteredTodos: Todo[];
  filterBy: string;
  setFilterBy: (filter: string) => void;
  loadingIds: number[];
  error: string;
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  unfinishedTodos: Todo[];
  editTodoTitle: string;
  setEditTodoTitle: (title: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  tempTodo: Todo | null;
  handleEditingTodo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleToggleAll: (todos: Todo[]) => void;
  handleEditFormSubmission: (todo: Todo) => void;
  handleDeleteTodo: (id: number) => void;
  handleCloseError: () => void;
  handleTodoToggle: (todo: Todo) => void;
  handleClearCompleted: (todos: Todo[]) => void;
  handleSubmitNewTodo: (e: React.FormEvent) => void;
}

export const TodoContext = React.createContext<TodoContextType>(
  {} as TodoContextType,
);

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoTitle, setTodoTitle] = useState('');
  const [filterBy, setFilterBy] = useState<string>(FILTER_TYPE.ALL);
  const [error, setError] = useState<string>(ERROR_TYPE.NONE);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Carregamento Inicial
  useEffect(() => {
    todoService
      .getTodos()
      .then(setTodos)
      .catch(() => setError(ERROR_TYPE.LOAD));
  }, []);

  // Foco automático no input
  useEffect(() => {
    inputRef.current?.focus();
  }, [todos, tempTodo, error]);

  const handleCloseError = useCallback(() => setError(ERROR_TYPE.NONE), []);
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTodoTitle(e.target.value);
  const handleEditingTodo = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditTodoTitle(e.target.value);

  // --- ADICIONAR TODO ---
  const handleSubmitNewTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = todoTitle.trim();

    if (!trimmedTitle) {
      setError(ERROR_TYPE.TITLE);

      return;
    }

    const newTodoData = {
      title: trimmedTitle,
      completed: false,
      userId: todoService.USER_ID,
    };

    setTempTodo({ ...newTodoData, id: 0 } as Todo);
    setLoadingIds(prev => [...prev, 0]);
    setError(ERROR_TYPE.NONE);

    todoService
      .postTodo(newTodoData)
      .then(createdTodo => {
        setTodos(prev => [...prev, createdTodo]);
        setTodoTitle('');
      })
      .catch(() => setError(ERROR_TYPE.ADD))
      .finally(() => {
        setTempTodo(null);
        setLoadingIds(prev => prev.filter(id => id !== 0));
      });
  };

  // --- DELETAR TODO ---
  const handleDeleteTodo = (id: number) => {
    setLoadingIds(prev => [...prev, id]);

    todoService
      .deleteTodo(id)
      .then(() => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
      })
      .catch(() => setError(ERROR_TYPE.DELETE))
      .finally(() => {
        setLoadingIds(prev => prev.filter(curr => curr !== id));
      });
  };

  // --- ALTERAR STATUS (CHECKBOX) ---
  const handleTodoToggle = (todo: Todo) => {
    setLoadingIds(prev => [...prev, todo.id]);

    todoService
      .patchTodo({ ...todo, completed: !todo.completed })
      .then(updatedTodo => {
        setTodos(prev => prev.map(t => (t.id === todo.id ? updatedTodo : t)));
      })
      .catch(() => setError(ERROR_TYPE.UPDATE))
      .finally(() => {
        setLoadingIds(prev => prev.filter(curr => curr !== todo.id));
      });
  };

  // --- ALTERAR STATUS DE TODOS (TOGGLE ALL) ---
  const handleToggleAll = (allTodos: Todo[]) => {
    const areAllCompleted = allTodos.every(t => t.completed);
    const todosToUpdate = areAllCompleted
      ? allTodos
      : allTodos.filter(t => !t.completed);

    setLoadingIds(prev => [...prev, ...todosToUpdate.map(t => t.id)]);

    todoService
      .patchAllTodos(allTodos)
      .then(updatedTodos => {
        setTodos(prev =>
          prev.map(t => {
            const found = updatedTodos.find(res => res.id === t.id);

            return found || t;
          }),
        );
      })
      .catch(() => setError(ERROR_TYPE.UPDATE))
      .finally(() => setLoadingIds([]));
  };

  // --- LIMPAR COMPLETADOS ---
  const handleClearCompleted = (allTodos: Todo[]) => {
    const completed = allTodos.filter(t => t.completed);

    setLoadingIds(prev => [...prev, ...completed.map(t => t.id)]);

    todoService
      .deleteCompletedTodos(allTodos)
      .then(() => {
        setTodos(prev => prev.filter(t => !t.completed));
      })
      .catch(() => setError(ERROR_TYPE.DELETE))
      .finally(() => setLoadingIds([]));
  };

  // Filtros e Derivações
  const unfinishedTodos = todos.filter(t => !t.completed);

  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      if (filterBy === FILTER_TYPE.ACTIVE) {
        return !todo.completed;
      }

      if (filterBy === FILTER_TYPE.COMPLETED) {
        return todo.completed;
      }

      return true;
    });
  }, [todos, filterBy]);

  // Edição (Será implementada na Task de Update)
  const handleEditFormSubmission = () => {};

  const value = {
    todos,
    todoTitle,
    filteredTodos,
    filterBy,
    setFilterBy,
    loadingIds,
    error,
    editingId,
    setEditingId,
    unfinishedTodos,
    editTodoTitle,
    setEditTodoTitle,
    inputRef,
    tempTodo,
    handleEditingTodo,
    handleTitleChange,
    handleToggleAll,
    handleEditFormSubmission,
    handleDeleteTodo,
    handleCloseError,
    handleTodoToggle,
    handleClearCompleted,
    handleSubmitNewTodo,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};
