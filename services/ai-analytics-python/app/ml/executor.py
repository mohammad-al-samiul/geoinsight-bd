from concurrent.futures import ProcessPoolExecutor

_executor: ProcessPoolExecutor | None = None


def startup_executor(pool_size: int) -> ProcessPoolExecutor:
    global _executor
    _executor = ProcessPoolExecutor(max_workers=pool_size)
    return _executor


def shutdown_executor(executor: ProcessPoolExecutor) -> None:
    executor.shutdown(wait=False, cancel_futures=True)
    global _executor
    _executor = None


def get_executor() -> ProcessPoolExecutor:
    if _executor is None:
        raise RuntimeError("Process pool not initialized")
    return _executor
